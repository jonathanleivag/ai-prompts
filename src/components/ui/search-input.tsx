"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useRef } from "react";

function SearchIcon() {
  return (
    <svg className="search-wrap__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 10.5 13.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SearchInput({ defaultValue, placeholder, small }: { defaultValue?: string; placeholder?: string; small?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleChange(value: string) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      params.delete("page");
      startTransition(() => router.replace(`${pathname}?${params.toString()}`));
    }, 300);
  }

  return (
    <div className={`search-wrap${small ? " search-wrap--sm" : ""}`}>
      <input
        className={`search-input${small ? " search-input--sm" : ""}`}
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder ?? "Buscar…"}
        onChange={(e) => handleChange(e.target.value)}
        aria-label={placeholder ?? "Buscar"}
      />
      <SearchIcon />
    </div>
  );
}
