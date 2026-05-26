import CadEditor from "@/components/cad-editor";

export const metadata = { title: "CAD Editor — FEEDRATE" };

export default function EditorPage() {
  return (
    <section>
      <div className="phead">
        <div className="eyebrow">CAD EDITOR · 3D CREATE</div>
        <h1>Browser CAD Editor</h1>
        <p>Build a part with primitives and boolean ops — no software to install — then export it or get a price.</p>
      </div>
      <CadEditor />
    </section>
  );
}
