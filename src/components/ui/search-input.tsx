"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useRef } from "react";

export function SearchInput({ defaultValue, placeholder }: { defaultValue?: string; placeholder?: string }) {
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
    <input
      className="search-input"
      type="search"
      defaultValue={defaultValue}
      placeholder={placeholder ?? "Buscar…"}
      onChange={(e) => handleChange(e.target.value)}
      aria-label={placeholder ?? "Buscar"}
    />
  );
}
