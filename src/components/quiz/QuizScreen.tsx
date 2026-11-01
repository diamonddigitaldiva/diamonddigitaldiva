import { useId, useMemo, useState } from "react";
import { QuizButton } from "@/components/ui/quiz-button";
import { cn } from "@/lib/utils";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Check, Search } from "lucide-react";
import { toggleMulti, isV3Answered, type V3Answers, type V3AnswerValue, type V3Question } from "@/lib/assessment/v3";

interface QuizScreenProps {
  question: V3Question;
  position: number; // 1-based among visible questions
  total: number;
  answers: V3Answers;
  onChange: (key: string, value: V3AnswerValue | undefined) => void;
  onBack: () => void;
  onNext: () => void;
  canGoBack: boolean;
  isLast: boolean;
  restored?: boolean;
  onStartOver?: () => void;
}

const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-amethyst focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";

function CheckOption({ label, checked, onToggle, id }: { label: string; checked: boolean; onToggle: () => void; id: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-option-id={id}
      onClick={onToggle}
      className={cn("quiz-option w-full text-left flex items-start gap-3", focusRing, checked && "selected")}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border",
          checked ? "border-amethyst bg-amethyst text-pearl" : "border-charcoal/40 bg-pearl"
        )}
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
      <span className="text-[14px] text-charcoal leading-relaxed">{label}</span>
    </button>
  );
}

export function QuizScreen({
  question,
  position,
  total,
  answers,
  onChange,
  onBack,
  onNext,
  canGoBack,
  isLast,
  restored,
  onStartOver,
}: QuizScreenProps) {
  const uid = useId();
  const headingId = `quiz-question-${question.id}`;
  const helperId = `${headingId}-helper`;
  const [limitMsg, setLimitMsg] = useState("");
  const [search, setSearch] = useState("");
  const progress = (position / total) * 100;
  const value = answers[question.id];
  const selected = Array.isArray(value) ? value : [];
  const answered = isV3Answered(question, answers);
  const isEmptyOptional =
    !question.required &&
    (value === undefined || (Array.isArray(value) && value.length === 0) || value === "") &&
    !(question.sideText && answers[question.sideText.key]);

  const toggle = (optionId: string) => {
    const next = toggleMulti(question, selected, optionId);
    if (next === selected && !selected.includes(optionId)) {
      setLimitMsg(`You can choose up to ${question.maxSelections === 2 ? "two" : question.maxSelections}. Unselect one to pick another.`);
      return;
    }
    setLimitMsg("");
    onChange(question.id, next);
  };

  const ownedStatus = question.options.filter((o) => !o.id.startsWith("res_"));
  const ownedResources = question.options.filter((o) => o.id.startsWith("res_"));
  const filteredResources = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? ownedResources.filter((o) => o.label.toLowerCase().includes(s)) : ownedResources;
  }, [search, ownedResources]);

  const sideText = question.sideText;
  const showSide = sideText && (!sideText.whenOption || selected.includes(sideText.whenOption));
  const sideValue = sideText ? (answers[sideText.key] as string | undefined) ?? "" : "";

  return (
    <div className="animate-fade-in">
      {restored && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-pearl px-4 py-3 text-[13px] text-charcoal/80">
          <span>We restored your progress from this device.</span>
          {onStartOver && (
            <button type="button" onClick={onStartOver} className={cn("underline text-amethyst", focusRing)}>
              Start over
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="eyebrow text-charcoal/80">
          Question {position} of {total}
        </span>
        <span className="eyebrow text-amethyst" aria-hidden="true">
          {Math.round(progress)}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Assessment progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={position}
        aria-valuetext={`Question ${position} of ${total}`}
        className="h-[3px] bg-border rounded-full overflow-hidden mb-8"
      >
        <div className="h-full bg-amethyst transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <p aria-live="polite" className="sr-only">
        Question {position} of {total}: {question.text}
      </p>

      <h2 id={headingId} className="font-heading text-2xl md:text-3xl text-charcoal mb-3 leading-tight">
        {question.text}
      </h2>
      {(question.helper || !question.required) && (
        <p id={helperId} className="text-[13px] text-charcoal/75 mb-6">
          {question.helper}
          {!question.required && <span className="ml-1">(Optional)</span>}
        </p>
      )}
      {!question.helper && question.required && <div className="mb-5" />}

      {question.kind === "single" && (
        <RadioGroup.Root
          aria-labelledby={headingId}
          aria-describedby={question.helper ? helperId : undefined}
          value={typeof value === "string" ? value : ""}
          onValueChange={(v) => onChange(question.id, v)}
          loop={false}
          className="flex flex-col gap-3 mb-8"
        >
          {question.options.map((option) => (
            <RadioGroup.Item
              key={option.id}
              value={option.id}
              data-option-id={option.id}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onChange(question.id, option.id);
                }
              }}
              className={cn("quiz-option w-full text-left", focusRing, value === option.id && "selected")}
            >
              <div className="text-[14px] text-charcoal leading-relaxed">{option.label}</div>
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      )}

      {question.kind === "multi" && (
        <div role="group" aria-labelledby={headingId} aria-describedby={question.helper ? helperId : undefined} className="flex flex-col gap-3 mb-4">
          {question.options.map((o) => (
            <CheckOption key={o.id} id={o.id} label={o.label} checked={selected.includes(o.id)} onToggle={() => toggle(o.id)} />
          ))}
        </div>
      )}

      {question.kind === "matrix" && (
        <div className="flex flex-col gap-5 mb-8">
          {(question.rows ?? []).map((row) => {
            const rowVal = (value as Record<string, string> | undefined)?.[row.id] ?? "";
            const legendId = `${uid}-${row.id}`;
            return (
              <fieldset key={row.id} className="border-0 p-0 m-0">
                <legend id={legendId} className="text-[14px] text-charcoal font-medium mb-2">
                  {row.label}
                </legend>
                <RadioGroup.Root
                  aria-labelledby={legendId}
                  value={rowVal}
                  onValueChange={(v) => onChange(question.id, { ...((value as Record<string, string>) ?? {}), [row.id]: v })}
                  orientation="horizontal"
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                >
                  {question.options.map((o) => (
                    <RadioGroup.Item
                      key={o.id}
                      value={o.id}
                      data-row-id={row.id}
                      data-option-id={o.id}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          onChange(question.id, { ...((value as Record<string, string>) ?? {}), [row.id]: o.id });
                        }
                      }}
                      className={cn("quiz-option !p-3 text-center text-[13px] text-charcoal", focusRing, rowVal === o.id && "selected")}
                    >
                      {o.label}
                    </RadioGroup.Item>
                  ))}
                </RadioGroup.Root>
              </fieldset>
            );
          })}
        </div>
      )}

      {question.kind === "owned" && (
        <div className="mb-4 space-y-4">
          <div role="group" aria-labelledby={headingId} className="flex flex-col gap-3">
            {ownedStatus.map((o) => (
              <CheckOption key={o.id} id={o.id} label={o.label} checked={selected.includes(o.id)} onToggle={() => toggle(o.id)} />
            ))}
          </div>
          <div>
            <label htmlFor={`${uid}-search`} className="eyebrow text-charcoal/80 block mb-2">
              Search resources
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal/50" aria-hidden="true" />
              <input
                id={`${uid}-search`}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a course or tool name"
                className="w-full pl-9 pr-3 py-3 rounded-sm border border-border bg-pearl text-charcoal font-input text-[15px] focus:outline-none focus:border-amethyst focus:ring-1 focus:ring-amethyst/40"
              />
            </div>
            <p className="text-[12px] text-charcoal/70 mt-2" aria-live="polite">
              {selected.filter((x) => x.startsWith("res_")).length} selected
              {search.trim() ? ` · ${filteredResources.length} match${filteredResources.length === 1 ? "" : "es"}` : ""}
            </p>
          </div>
          <div role="group" aria-label="Resources you own" className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {filteredResources.map((o) => (
              <CheckOption key={o.id} id={o.id} label={o.label} checked={selected.includes(o.id)} onToggle={() => toggle(o.id)} />
            ))}
            {filteredResources.length === 0 && (
              <p className="text-[13px] text-charcoal/70">No match. You can type the name below.</p>
            )}
          </div>
        </div>
      )}

      {question.kind === "text" && (
        <div className="mb-6">
          <label htmlFor={`${uid}-text`} className="sr-only">
            {question.text}
          </label>
          <textarea
            id={`${uid}-text`}
            value={typeof value === "string" ? value : ""}
            maxLength={question.maxLength}
            rows={5}
            aria-describedby={helperId}
            onChange={(e) => onChange(question.id, e.target.value || undefined)}
            className="w-full px-4 py-3 rounded-sm border border-border bg-pearl text-charcoal font-input text-[15px] focus:outline-none focus:border-amethyst focus:ring-1 focus:ring-amethyst/40"
          />
          <p className="text-[12px] text-charcoal/70 mt-1 text-right">
            {(typeof value === "string" ? value.length : 0)}/{question.maxLength}
          </p>
          <p className="text-[12px] text-charcoal/70 mt-1">Please don't include passwords or payment details.</p>
        </div>
      )}

      {sideText && showSide && (
        <div className="mb-6">
          <label htmlFor={`${uid}-side`} className="eyebrow text-charcoal/80 block mb-2">
            {sideText.label}
          </label>
          <input
            id={`${uid}-side`}
            type="text"
            value={sideValue}
            maxLength={sideText.maxLength}
            onChange={(e) => onChange(sideText.key, e.target.value || undefined)}
            className="w-full px-4 py-3 rounded-sm border border-border bg-pearl text-charcoal font-input text-[15px] focus:outline-none focus:border-amethyst focus:ring-1 focus:ring-amethyst/40"
          />
        </div>
      )}

      <p aria-live="polite" className="text-[12px] text-amethyst min-h-[1.25em] mb-4">
        {limitMsg}
      </p>

      <div className="flex justify-between gap-3">
        <QuizButton variant="ghost" onClick={onBack} disabled={!canGoBack}>
          Back
        </QuizButton>
        <QuizButton onClick={onNext} disabled={!answered}>
          {isLast ? "Finish" : isEmptyOptional ? "Skip" : "Next"}
        </QuizButton>
      </div>
    </div>
  );
}
