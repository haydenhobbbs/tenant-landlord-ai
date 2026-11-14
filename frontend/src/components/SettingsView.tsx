"use client";

// ⚙️ Settings screen, shared by tenants (/tenant/settings) and landlords
// (/landlord/settings). Appearance lives here instead of on every screen.

import { useRouter } from "next/navigation";
import { Check, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth";
import { setPreference, usePreferences, type Preferences } from "@/lib/preferences";

type Option<V> = { value: V; label: string; hint?: string; icon?: React.ReactNode; preview?: React.ReactNode };

export function SettingsView() {
  const prefs = usePreferences();
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <div className="stagger mx-auto max-w-3xl space-y-12">
      <PageHeader title="Settings" intro="Make FixFlow comfortable to read. Changes save right away." />

      <Group
        title="Colors"
        name="theme"
        value={prefs.theme}
        onChange={(v) => setPreference("theme", v)}
        options={[
          { value: "light", label: "Light", hint: "Dark text on a light page", icon: <Sun aria-hidden /> },
          { value: "dark", label: "Dark", hint: "Light text on a dark page", icon: <Moon aria-hidden /> },
          { value: "system", label: "Match my device", hint: "Follows your phone or computer", icon: <Monitor aria-hidden /> },
        ]}
      />

      <Group
        title="Text size"
        name="textSize"
        value={prefs.textSize}
        onChange={(v) => setPreference("textSize", v)}
        options={[
          { value: "standard", label: "Standard", preview: <span className="text-[1.05rem]">Aa</span> },
          { value: "large", label: "Large", preview: <span className="text-[1.3rem]">Aa</span> },
          { value: "xlarge", label: "Extra large", preview: <span className="text-[1.55rem]">Aa</span> },
        ]}
      />

      <Group
        title="Movement"
        name="motion"
        value={prefs.motion}
        onChange={(v) => setPreference("motion", v)}
        options={[
          { value: "full", label: "Gentle animations", hint: "Things ease into place" },
          { value: "reduced", label: "No animations", hint: "Everything appears at once" },
        ]}
      />

      {user && (
        <section aria-labelledby="account" className="space-y-4">
          <h2 id="account" className="text-2xl">Your account</h2>
          <dl className="divide-y divide-line rounded-2xl border border-line bg-surface shadow-card">
            {[
              ["Name", user.name],
              ["Email", user.email],
              ["Account type", user.role === "landlord" ? "Landlord" : "Tenant"],
              ...(user.unit ? [["Unit", user.unit]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex flex-wrap justify-between gap-x-6 gap-y-1 px-5 py-4">
                <dt className="text-lg text-muted">{k}</dt>
                <dd className="text-lg font-semibold break-all">{v}</dd>
              </div>
            ))}
          </dl>
          <Button
            variant="secondary"
            icon={<LogOut aria-hidden />}
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
          >
            Sign out
          </Button>
        </section>
      )}
    </div>
  );
}

function Group<V extends Preferences[keyof Preferences]>({
  title,
  name,
  value,
  onChange,
  options,
}: {
  title: string;
  name: string;
  value: V;
  onChange: (v: V) => void;
  options: Option<V>[];
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 font-[family-name:var(--font-heading)] text-2xl font-semibold">{title}</legend>
      <div className={`grid gap-3 ${options.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <label
              key={o.value}
              className={`pressable relative flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-edge ${
                on ? "border-accent-edge bg-accent-soft" : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={on}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {(o.icon || o.preview) && (
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-xl font-bold transition-colors duration-300 [&_svg]:size-6 ${
                    on ? "bg-accent text-on-accent" : "bg-sunken text-fg"
                  }`}
                >
                  {o.icon ?? o.preview}
                </span>
              )}
              <span className="flex-1">
                <span className="block text-lg font-semibold">{o.label}</span>
                {o.hint && <span className="block text-base text-muted">{o.hint}</span>}
              </span>
              {on && (
                <span className="grid size-7 shrink-0 animate-pop place-items-center rounded-full bg-accent text-on-accent">
                  <Check className="size-4" strokeWidth={3} aria-hidden />
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
