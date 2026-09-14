"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
} from "@/presentation/components/ui";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import { Student, Batch } from "@/domain/entities/Student";
import { Check, X } from "lucide-react";

const repos = createRepositories();

export default function AttendancePage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    repos.batches.getAll().then((b) => {
      setBatches(b);
      if (b.length) setSelectedBatch(b[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedBatch) return;
    repos.students.getByBatch(selectedBatch).then((s) => {
      setStudents(s);
      const map: Record<string, boolean> = {};
      s.forEach((st) => (map[st.id] = true));
      setPresent(map);
      setSaved(false);
    });
  }, [selectedBatch]);

  async function save() {
    const records = students.map((s) => ({
      studentId: s.id,
      batchId: selectedBatch,
      date: today,
      present: !!present[s.id],
    }));
    await repos.attendance.markAttendance(records);
    setSaved(true);
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Attendance"
        subtitle={new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "short",
        })}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {batches.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBatch(b.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              selectedBatch === b.id
                ? "bg-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {students.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 text-center py-6">
            No students in this batch.
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {students.map((s) => (
              <Card
                key={s.id}
                className="!p-3 flex items-center justify-between"
              >
                <p className="text-sm font-medium">{s.name}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPresent({ ...present, [s.id]: true })
                    }
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                      present[s.id]
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() =>
                      setPresent({ ...present, [s.id]: false })
                    }
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${\n                      present[s.id] === false
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <X size={18} />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <Button className="w-full" size="lg" onClick={save}>
            {saved ? "✓ Saved" : "Save Attendance"}
          </Button>
        </>
      )}
    </div>
  );
}
