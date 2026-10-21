import * as React from "react";

export const Logo = () => {
  return (
    <a href="/" className="flex items-center gap-2.5 cursor-pointer no-underline group">
      <img
        src="/assets/homepage/logo-icon.png"
        alt="ScholarX Crest"
        className="w-8 h-8 object-contain transition-transform group-hover:scale-105"
      />
      <img
        src="/assets/homepage/wordmark.png"
        alt="ScholarX"
        className="h-6 w-auto object-contain"
      />
    </a>
  );
};
