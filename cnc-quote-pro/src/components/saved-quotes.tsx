"use client";

import { useEffect, useState } from "react";
import { listQuotes, deleteQuote, SAVED_EVENT, type SavedQuote } from "@/lib/storage/saved-quotes";

export default function SavedQuotes() {
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);

  useEffect(() => {
    const refresh = () => setQuotes(listQuotes());
    refresh();
    window.addEventListener(SAVED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SAVED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (quotes.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-h">
        <h3>Your Saved Quotes</h3>
        <span className="tag">LOCAL · {quotes.length}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>DATE</th>
            <th>MATERIAL</th>
            <th>SIZE</th>
            <th>QTY</th>
            <th>UNIT</th>
            <th>TOTAL</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id}>
              <td className="td-mono muted">{new Date(q.createdAt).toLocaleDateString("en-GB")}</td>
              <td>{q.materialName}</td>
              <td className="td-mono">{q.dimensions}</td>
              <td className="td-mono">{q.quantity}</td>
              <td className="td-mono">${q.pricePerPart.toFixed(2)}</td>
              <td className="td-mono">${q.totalPrice.toFixed(2)}</td>
              <td style={{ textAlign: "right" }}>
                <button onClick={() => deleteQuote(q.id)} className="muted" aria-label="Delete" style={{ fontSize: 13 }}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
