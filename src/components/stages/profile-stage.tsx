"use client";

import { FileText, ShieldCheck, UploadCloud, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import type { ClientProfileInput, DocumentUpload } from "@/types/domain";
import { makeId } from "@/lib/utils";
import { Pill, PrimaryButton, SectionCard, SecondaryButton } from "@/components/ui/primitives";

interface Props {
  profile: ClientProfileInput;
  files: DocumentUpload[];
  onProfileFieldChange: (field: keyof ClientProfileInput, value: string) => void;
  onFilesChange: (files: DocumentUpload[]) => void;
  onContinue: () => void;
  canContinue: boolean;
}

export function ProfileStage({ profile, files, onProfileFieldChange, onFilesChange, onContinue, canContinue }: Props) {
  const onDrop = (acceptedFiles: File[]) => {
    const next = acceptedFiles.map((file) => ({
      id: makeId("upload"),
      name: file.name,
      type: file.type,
      size: file.size,
      file
    }));
    onFilesChange([...files, ...next]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
      "application/json": [".json"]
    }
  });

  return (
    <SectionCard className="fade-up">
      <div className="relative z-10 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Pill>Stage 1</Pill>
              <Pill className="border-teal-200 bg-teal-50 text-teal-800">Secure intake</Pill>
            </div>
            <h2 className="text-3xl text-stone-900">Client Profile Gathering</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Capture the advisor&apos;s qualitative context first, then add portfolio statements or supporting documents. The app only moves forward once there is at least one text field or one uploaded document.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">Client label</span>
              <input
                value={profile.clientName}
                onChange={(event) => onProfileFieldChange("clientName", event.target.value)}
                placeholder="Retired couple household"
                className="w-full rounded-[20px] border border-stone-200 bg-white/80 px-4 py-3 outline-none ring-0 transition focus:border-teal-500"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-stone-700">Portfolio summary</span>
              <textarea
                value={profile.profileSummary}
                onChange={(event) => onProfileFieldChange("profileSummary", event.target.value)}
                placeholder="Example: Retired couple, age 65, $2M portfolio heavily concentrated in tech stocks."
                rows={4}
                className="w-full rounded-[20px] border border-stone-200 bg-white/80 px-4 py-3 outline-none transition focus:border-teal-500"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">Goals</span>
              <textarea
                value={profile.goals}
                onChange={(event) => onProfileFieldChange("goals", event.target.value)}
                placeholder="Income generation, volatility reduction, tax efficiency"
                rows={4}
                className="w-full rounded-[20px] border border-stone-200 bg-white/80 px-4 py-3 outline-none transition focus:border-teal-500"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">Advisor notes</span>
              <textarea
                value={profile.advisorNotes}
                onChange={(event) => onProfileFieldChange("advisorNotes", event.target.value)}
                placeholder="Legacy holdings, family considerations, restrictions, planning notes"
                rows={4}
                className="w-full rounded-[20px] border border-stone-200 bg-white/80 px-4 py-3 outline-none transition focus:border-teal-500"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`rounded-[28px] border border-dashed p-6 transition ${
              isDragActive ? "border-teal-600 bg-teal-50" : "border-stone-300 bg-white/70"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-start gap-4">
              <div className="rounded-full bg-stone-100 p-3 text-stone-700">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl text-stone-900">Drag, drop, and secure the statements</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  PDF, TXT, CSV, and JSON are accepted. Parsing and redaction happen on the server before any AI call is made.
                </p>
              </div>
              <SecondaryButton type="button">Browse files</SecondaryButton>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/70 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-teal-700" />
              <div>
                <p className="text-sm font-semibold text-stone-800">Privacy guardrail</p>
                <p className="text-sm text-stone-600">Sensitive identifiers are masked before the agent pipeline starts.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-[28px] border border-white/70 bg-white/70 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-stone-900">Uploaded evidence</h3>
              <Pill>{files.length} file{files.length === 1 ? "" : "s"}</Pill>
            </div>
            {files.length === 0 ? (
              <p className="text-sm leading-6 text-stone-500">No documents uploaded yet. You can still continue if you provide textual client context.</p>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between rounded-[20px] border border-stone-200 bg-white px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-full bg-amber-50 p-2 text-amber-700">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-800">{file.name}</p>
                        <p className="text-xs text-stone-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onFilesChange(files.filter((item) => item.id !== file.id))}
                      className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-5 text-sm leading-6 text-amber-900">
            Reviewers tend to care more about an elegant advisory workflow than raw financial-engine complexity. You can always start with one client and build the dashboard from completed recommendations.
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8 flex flex-col gap-3 border-t border-stone-200/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-800">Proceed when there is enough intake context.</p>
          <p className="text-sm text-stone-600">At least one text field or one uploaded document is required.</p>
        </div>
        <PrimaryButton onClick={onContinue} disabled={!canContinue}>
          Continue to Risk Assessment
        </PrimaryButton>
      </div>
    </SectionCard>
  );
}

