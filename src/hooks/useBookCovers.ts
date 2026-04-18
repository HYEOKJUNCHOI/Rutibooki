import { useEffect, useState } from "react";
import { Book } from "@/types/book";

export function useBookCovers(books: Book[]): Record<number, string> {
  const [covers, setCovers] = useState<Record<number, string>>({});

  useEffect(() => {
    books.forEach((book, idx) => {
      fetch(`/api/book-cover?title=${encodeURIComponent(book.searchQuery)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.image) {
            setCovers((prev) => ({ ...prev, [idx]: d.image }));
          }
        });
    });
  }, [books]);

  return covers;
}
