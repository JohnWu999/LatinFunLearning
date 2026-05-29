"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type StudentRow = {
  id: string;
  displayName: string;
  email: string;
  gems: number;
  rank: number | null;
  todayLearningLabel: string;
  totalLearningLabel: string;
  openMistakes: number;
  lastActiveLabel: string;
  reportHref: string;
};

type Props = {
  students: StudentRow[];
};

type Draft = {
  name: string;
  email: string;
  password: string;
};

const emptyDraft: Draft = {
  name: "",
  email: "",
  password: ""
};

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: string }; message?: string };
    return payload.error?.message ?? payload.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

function appPath(path: string) {
  if (typeof document === "undefined") return path;
  const asset = document.querySelector<HTMLScriptElement | HTMLLinkElement>('script[src*="/_next/"], link[href*="/_next/"]');
  const source = asset instanceof HTMLScriptElement ? asset.src : asset?.href;
  const prefix = source ? new URL(source, window.location.origin).pathname.split("/_next/")[0] : "";
  return `${prefix}${path}`;
}

export function AdminStudentManager({ students }: Props) {
  const router = useRouter();
  const [createDraft, setCreateDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit(student: StudentRow) {
    setEditingId(student.id);
    setEditDraft({
      name: student.displayName,
      email: student.email,
      password: ""
    });
    setMessage("");
  }

  async function createStudent() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(appPath("/api/admin/students"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDraft)
      });
      if (!response.ok) throw new Error(await readError(response));
      setCreateDraft(emptyDraft);
      setMessage("Student account created.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create student.");
    } finally {
      setBusy(false);
    }
  }

  async function updateStudent(studentId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(appPath(`/api/admin/students/${studentId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft)
      });
      if (!response.ok) throw new Error(await readError(response));
      setEditingId(null);
      setEditDraft(emptyDraft);
      setMessage("Student account updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update student.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteStudent(student: StudentRow) {
    const confirmed = window.confirm(`删除 ${student.displayName} 的学生账号后，学习记录、错题和宝石记录都会一并删除。确定继续吗？`);
    if (!confirmed) return;
    const typed = window.prompt(`请再次确认：输入 DELETE 删除 ${student.displayName}`);
    if (typed !== "DELETE") {
      setMessage("Delete canceled.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(appPath(`/api/admin/students/${student.id}`), { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response));
      setMessage("Student account deleted.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete student.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel admin-student-manager">
      <div className="admin-panel-head">
        <h2>Student Accounts</h2>
        <span>{students.length} accounts</span>
      </div>

      <div className="admin-create-student">
        <label>
          Name
          <input
            onChange={(event) => setCreateDraft((draft) => ({ ...draft, name: event.target.value }))}
            placeholder="Student name"
            value={createDraft.name}
          />
        </label>
        <label>
          Email
          <input
            autoComplete="off"
            onChange={(event) => setCreateDraft((draft) => ({ ...draft, email: event.target.value }))}
            placeholder="student@example.com"
            type="email"
            value={createDraft.email}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="new-password"
            onChange={(event) => setCreateDraft((draft) => ({ ...draft, password: event.target.value }))}
            placeholder="At least 6 characters"
            type="password"
            value={createDraft.password}
          />
        </label>
        <button className="button primary" disabled={busy || !createDraft.name || !createDraft.email || createDraft.password.length < 6} onClick={createStudent} type="button">
          Add Student
        </button>
      </div>

      {message ? <div className="admin-manager-message">{message}</div> : null}

      <div className="admin-student-table">
        <div className="admin-student-row admin-student-row-managed header">
          <span>Student</span>
          <span>Email</span>
          <span>Gems</span>
          <span>Today</span>
          <span>Total Time</span>
          <span>Open Mistakes</span>
          <span>Last Active</span>
          <span>Actions</span>
        </div>
        {students.length ? students.map((student) => {
          const isEditing = editingId === student.id;
          return (
            <div className="admin-student-row admin-student-row-managed" key={student.id}>
              {isEditing ? (
                <>
                  <input
                    onChange={(event) => setEditDraft((draft) => ({ ...draft, name: event.target.value }))}
                    value={editDraft.name}
                  />
                  <input
                    autoComplete="off"
                    onChange={(event) => setEditDraft((draft) => ({ ...draft, email: event.target.value }))}
                    type="email"
                    value={editDraft.email}
                  />
                  <input
                    autoComplete="new-password"
                    onChange={(event) => setEditDraft((draft) => ({ ...draft, password: event.target.value }))}
                    placeholder="New password optional"
                    type="password"
                    value={editDraft.password}
                  />
                  <span>{student.todayLearningLabel}</span>
                  <span>{student.totalLearningLabel}</span>
                  <span>{student.openMistakes} open mistakes</span>
                  <span>{student.lastActiveLabel}</span>
                  <div className="admin-student-actions">
                    <button className="button primary" disabled={busy || !editDraft.name || !editDraft.email} onClick={() => updateStudent(student.id)} type="button">Save</button>
                    <button className="button" disabled={busy} onClick={() => setEditingId(null)} type="button">Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <strong>{student.displayName}</strong>
                  <span>{student.email}</span>
                  <span>{student.gems}</span>
                  <span>{student.todayLearningLabel}</span>
                  <span>{student.totalLearningLabel}</span>
                  <span>{student.openMistakes}</span>
                  <span>{student.lastActiveLabel}</span>
                  <div className="admin-student-actions">
                    <Link href={student.reportHref}>Report</Link>
                    <button className="button" disabled={busy} onClick={() => startEdit(student)} type="button">Edit</button>
                    <button className="button danger" disabled={busy} onClick={() => deleteStudent(student)} type="button">Delete</button>
                  </div>
                </>
              )}
            </div>
          );
        }) : (
          <p className="admin-empty">No student accounts yet.</p>
        )}
      </div>
    </section>
  );
}
