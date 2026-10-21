#!/usr/bin/env bash
# ScholarX Local Services Manager
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$HOME/.local/bin:$HOME/.local/usr/bin:/usr/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/.local/usr/lib:$LD_LIBRARY_PATH"

start_services() {
    echo "▶ Starting Local Services for ScholarX..."

    # 1. MongoDB
    if ! ss -tulpn | grep -q ":27017 "; then
        echo "  • Starting MongoDB on 127.0.0.1:27017..."
        mkdir -p "$HOME/.local/share/mongodb/data"
        mongod --dbpath "$HOME/.local/share/mongodb/data" --port 27017 --bind_ip 127.0.0.1 --logpath "$HOME/.local/share/mongodb/mongod.log" --fork
    else
        echo "  ✔ MongoDB already running (27017)"
    fi

    # 2. Redis
    if ! ss -tulpn | grep -q ":6379 "; then
        echo "  • Starting Redis on 127.0.0.1:6379..."
        mkdir -p "$HOME/.local/share/redis"
        redis-server --daemonize yes --dir "$HOME/.local/share/redis" --logfile "$HOME/.local/share/redis/redis.log" --port 6379
    else
        echo "  ✔ Redis already running (6379)"
    fi

    # 3. PostgreSQL
    if ! ss -tulpn | grep -q ":5432 "; then
        echo "  • Starting PostgreSQL on 127.0.0.1:5432..."
        mkdir -p "$HOME/.local/share/postgres/run"
        pg_ctl -D "$HOME/.local/share/postgres/data" -l "$HOME/.local/share/postgres/postgres.log" -o "-p 5432 -k $HOME/.local/share/postgres/run" start
    else
        echo "  ✔ PostgreSQL already running (5432)"
    fi

    # 4. Supabase Local PostgREST API
    if ! ss -tulpn | grep -q ":54321 "; then
        echo "  • Starting Supabase PostgREST on 127.0.0.1:54321..."
        mkdir -p "$HOME/.local/share/supabase"
        nohup postgrest "$HOME/.local/share/supabase/postgrest.conf" > "$HOME/.local/share/supabase/postgrest.log" 2>&1 &
    else
        echo "  ✔ Supabase PostgREST already running (54321)"
    fi

    echo "✔ All ScholarX local services active and ready."
}

stop_services() {
    echo "⏹ Stopping ScholarX Local Services..."
    pkill -f "postgrest" || true
    pg_ctl -D "$HOME/.local/share/postgres/data" stop || true
    redis-cli shutdown nosave || true
    mongod --dbpath "$HOME/.local/share/mongodb/data" --shutdown || true
    echo "✔ All local services stopped."
}

status_services() {
    echo "=== ScholarX Local Services Status ==="
    echo -n "PostgreSQL (5432):  " && (ss -tulpn | grep -q ":5432 " && echo "🟢 RUNNING" || echo "🔴 STOPPED")
    echo -n "Supabase REST (54321): " && (ss -tulpn | grep -q ":54321 " && echo "🟢 RUNNING" || echo "🔴 STOPPED")
    echo -n "MongoDB (27017):     " && (ss -tulpn | grep -q ":27017 " && echo "🟢 RUNNING" || echo "🔴 STOPPED")
    echo -n "Redis (6379):        " && (ss -tulpn | grep -q ":6379 " && echo "🟢 RUNNING" || echo "🔴 STOPPED")
    echo "======================================"
}

case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 1
        start_services
        ;;
    status)
        status_services
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
