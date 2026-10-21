#!/usr/bin/env bash
# ==============================================================================
# ScholarX Unified Launch & Management Script
# Starts:
#   1. Local Services: PostgreSQL (5432), PostgREST/Supabase (54321),
#                      MongoDB (27017), Redis (6379)
#   2. ScholarX Core Backend: Node.js Express + WebSockets (5000)
#   3. ScholarX Frontend: Angular 19 Application (4200)
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$HOME/.local/bin:$HOME/.local/usr/bin:/usr/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/.local/usr/lib:$LD_LIBRARY_PATH"

LOG_DIR="$PROJECT_ROOT/.logs"
mkdir -p "$LOG_DIR"

start_services() {
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
        setsid nohup postgrest "$HOME/.local/share/supabase/postgrest.conf" </dev/null > "$HOME/.local/share/supabase/postgrest.log" 2>&1 &
    else
        echo "  ✔ Supabase PostgREST already running (54321)"
    fi
}

start_all() {
    echo "=========================================================="
    echo "        🚀 Launching ScholarX Platform Stack             "
    echo "=========================================================="

    # 1. Start Local Database & Cache Services
    start_services

    # 2. Start Backend Server (Port 5000)
    if ! ss -tulpn | grep -q ":5000 "; then
        echo "  • Starting ScholarX Backend (http://localhost:5000)..."
        cd "$PROJECT_ROOT/backend"
        setsid nohup npm run dev </dev/null > "$LOG_DIR/backend.log" 2>&1 &
        echo $! > "$LOG_DIR/backend.pid"
        cd "$PROJECT_ROOT"
    else
        echo "  ✔ ScholarX Backend already running on port 5000"
    fi

    # Wait for backend health endpoint to respond
    echo -n "  • Awaiting backend availability..."
    for i in {1..30}; do
        if curl -s http://127.0.0.1:5000/api/v1/health > /dev/null 2>&1; then
            echo " 🟢 ONLINE"
            break
        fi
        sleep 1
        echo -n "."
    done

    # 3. Start Frontend (Port 4200)
    if ! ss -tulpn | grep -q ":4200 "; then
        echo "  • Starting ScholarX Frontend (http://localhost:4200)..."
        cd "$PROJECT_ROOT"
        setsid nohup npm run start </dev/null > "$LOG_DIR/frontend.log" 2>&1 &
        echo $! > "$LOG_DIR/frontend.pid"
    else
        echo "  ✔ ScholarX Frontend already running on port 4200"
    fi

    echo ""
    echo "=========================================================="
    echo "  🎉 All ScholarX Services & Portals are Initialized!     "
    echo "----------------------------------------------------------"
    echo "  • Angular Web App:   http://localhost:4200"
    echo "  • Backend API:       http://localhost:5000/api/v1"
    echo "  • WebSocket Bus:     ws://localhost:5000/ws"
    echo "  • Supabase REST API: http://127.0.0.1:54321"
    echo "  • PostgreSQL:        localhost:5432 (db: scholarx)"
    echo "  • MongoDB:           localhost:27017 (db: scholarx)"
    echo "  • Redis:             localhost:6379"
    echo "----------------------------------------------------------"
    echo "  Logs: $LOG_DIR/backend.log | $LOG_DIR/frontend.log"
    echo "  Stop everything with: ./run.sh stop"
    echo "=========================================================="
}

stop_all() {
    echo "=========================================================="
    echo "        ⏹ Stopping ScholarX Platform Stack               "
    echo "=========================================================="

    # Stop frontend
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        PID=$(cat "$LOG_DIR/frontend.pid" 2>/dev/null || true)
        if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            echo "  • Stopping Frontend (PID: $PID)..."
            kill "$PID" 2>/dev/null || true
        fi
        rm -f "$LOG_DIR/frontend.pid"
    fi
    pkill -f "ng serve" 2>/dev/null || true

    # Stop backend
    if [ -f "$LOG_DIR/backend.pid" ]; then
        PID=$(cat "$LOG_DIR/backend.pid" 2>/dev/null || true)
        if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            echo "  • Stopping Backend (PID: $PID)..."
            kill "$PID" 2>/dev/null || true
        fi
        rm -f "$LOG_DIR/backend.pid"
    fi
    pkill -f "ts-node src/server.ts" 2>/dev/null || true
    pkill -f "dist/server.js" 2>/dev/null || true

    # Stop PostgREST
    pkill -f "postgrest" 2>/dev/null || true

    # Stop Postgres
    pg_ctl -D "$HOME/.local/share/postgres/data" stop 2>/dev/null || true

    # Stop Redis
    redis-cli shutdown nosave 2>/dev/null || true

    # Stop MongoDB
    mongod --dbpath "$HOME/.local/share/mongodb/data" --shutdown 2>/dev/null || true

    echo "✔ All ScholarX services and servers stopped."
}

status_all() {
    echo "=========================================================="
    echo "             ScholarX Platform Live Status                "
    echo "=========================================================="
    echo -n "PostgreSQL (5432):     " && (ss -tulpn | grep -q ":5432 " && echo "🟢 RUNNING" || echo "🔴 STOPPED")
    echo -n "Supabase REST (54321): " && (ss -tulpn | grep -q ":54321 " && echo "🟢 RUNNING" || echo "🔴 STOPPED")
    echo -n "MongoDB (27017):        " && (ss -tulpn | grep -q ":27017 " && echo "🟢 RUNNING" || echo "🔴 STOPPED")
    echo -n "Redis (6379):           " && (ss -tulpn | grep -q ":6379 " && echo "🟢 RUNNING" || echo "🔴 STOPPED")
    echo -n "Backend API (5000):     " && (ss -tulpn | grep -q ":5000 " && echo "🟢 RUNNING" || echo "🔴 STOPPED")
    echo -n "Frontend App (4200):    " && (ss -tulpn | grep -q ":4200 " && echo "🟢 RUNNING" || echo "🔴 STOPPED")
    echo "=========================================================="
}

logs_all() {
    tail -f "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log"
}

case "$1" in
    start|"")
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        sleep 2
        start_all
        ;;
    status)
        status_all
        ;;
    logs)
        logs_all
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
