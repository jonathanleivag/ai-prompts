import Link from "next/link";

export function Pagination({ page, total, pageSize, basePath, searchParams }: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  searchParams: Record<string, string>;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  function pageUrl(p: number) {
    const params = new URLSearchParams({ ...searchParams, page: String(p) });
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav className="pagination" aria-label="Paginación">
      {page > 1
        ? <Link className="pagination__btn" href={pageUrl(page - 1)}>← Anterior</Link>
        : <span className="pagination__btn pagination__btn--disabled">← Anterior</span>
      }
      <span className="pagination__info">{page} / {totalPages}</span>
      {page < totalPages
        ? <Link className="pagination__btn" href={pageUrl(page + 1)}>Siguiente →</Link>
        : <span className="pagination__btn pagination__btn--disabled">Siguiente →</span>
      }
    </nav>
  );
}
