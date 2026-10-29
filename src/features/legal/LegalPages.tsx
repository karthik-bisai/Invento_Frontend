import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'

const UPDATED = '23 October 2026'

function LegalLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="Back to home" className="rounded-md">
          <Logo />
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-20 pt-6 sm:px-8">
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden />
          Back
        </Link>
        <article className="animate-rise">
          <h1 className="font-display text-5xl leading-tight">{title}</h1>
          <p className="mt-2 text-xs text-fg-subtle">Last updated {UPDATED}</p>
          <p className="mt-6 max-w-prose text-base leading-relaxed text-fg-muted">{intro}</p>
          <div className="mt-10 flex flex-col gap-9">{children}</div>
        </article>
      </main>

      <footer className="border-t border-border">
        <nav aria-label="Legal" className="mx-auto flex max-w-3xl gap-5 px-5 py-6 text-sm text-fg-subtle sm:px-8">
          <Link to="/terms" className="underline-offset-4 hover:text-fg hover:underline">
            Terms
          </Link>
          <Link to="/privacy" className="underline-offset-4 hover:text-fg hover:underline">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-3 flex max-w-prose flex-col gap-3 text-sm leading-relaxed text-fg-muted">{children}</div>
    </section>
  )
}

const List = ({ items }: { items: string[] }) => (
  <ul className="flex list-disc flex-col gap-1.5 pl-5">
    {items.map((i) => (
      <li key={i}>{i}</li>
    ))}
  </ul>
)

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy" intro="Invento is run by the organization that gave you access. This page explains what the software stores about you and why. Your organization decides how long it keeps that data and who can see it.">
      <Section title="What Invento stores about you">
        <List
          items={[
            'Your email address, and your name, job title and phone number if you add them.',
            'A profile picture, if you upload one.',
            'Your password, as a one-way hash. Nobody, including administrators, can read it.',
            'Your role and your settings (theme, table density, notification choices).',
            'The devices you are signed in on: browser and system, network address, and when each was last active.',
            'Your notifications, and your access request if you signed up yourself.',
            'The stock, product and warehouse records you and your colleagues enter.',
          ]}
        />
      </Section>

      <Section title="Cookies and local storage">
        <p>Invento sets one essential cookie that keeps you signed in. It is HTTP-only, so scripts on the page cannot read it. There are no advertising or tracking cookies, and no analytics.</p>
        <p>Your browser also stores your theme choice and a note that you are probably signed in, so the app can load faster. These stay on your device.</p>
      </Section>

      <Section title="Email">
        <p>We email you when you ask us to or when something affects your account: sign-up and sign-in codes, password resets and changes, and the outcome of an access request. Administrators also get an email when someone requests access, unless they turn that off under Settings.</p>
        <p>Messages are sent through the mail service your organization configured, which therefore handles them.</p>
      </Section>

      <Section title="Who can see what">
        <List
          items={[
            'Administrators can see every user’s name, email, role and access requests, and can change roles or deactivate accounts.',
            'Colleagues can see your name or email and picture where you appear, such as in the people list if they are an administrator.',
            'Your password and sign-in codes are never shown to anyone.',
          ]}
        />
      </Section>

      <Section title="Your choices">
        <List
          items={[
            'Edit or clear your details and picture any time under Profile.',
            'Sign out other devices, or change your password, under Settings → Security. Changing it signs out every other device.',
            'To have your account deactivated or your data removed, ask your organization’s administrator.',
          ]}
        />
      </Section>

      <Section title="Security">
        <p>Passwords are hashed. Sign-in codes expire in minutes, work once, and are limited in how many times they can be tried. Connections between your browser and Invento should be encrypted in any real deployment, and sign-in attempts are rate limited.</p>
      </Section>

      <Section title="Questions">
        <p>Contact your organization’s administrator. They run this workspace and are responsible for how it is used.</p>
      </Section>
    </LegalLayout>
  )
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of use" intro="These terms apply to using Invento. They are set by the organization that runs this workspace, which may add its own policies.">
      <Section title="Getting access">
        <p>New accounts are approved by an administrator and start with the lowest level of access. Administrators can change a role, or turn an account off, at any time.</p>
      </Section>

      <Section title="Your account">
        <List
          items={[
            'Keep your password and sign-in codes to yourself, and use a password you don’t use elsewhere.',
            'Tell an administrator if you think someone else has used your account.',
            'You are responsible for what is done with your account.',
          ]}
        />
      </Section>

      <Section title="Using Invento">
        <List
          items={[
            'Enter stock, product and warehouse information accurately. Others make decisions from it.',
            'Don’t try to get past the access you were given, or to disrupt the service or other people’s use of it.',
            'Don’t upload anything unlawful or that isn’t yours to share. Profile pictures must be PNG, JPEG or WebP images.',
          ]}
        />
      </Section>

      <Section title="Availability">
        <p>Invento is provided as it is. We work to keep it available and your data safe, but your organization is responsible for backups and for deciding how long records are kept.</p>
      </Section>

      <Section title="Ending access">
        <p>You can stop using Invento at any time. An administrator can end your access if these terms are broken or if your role changes.</p>
      </Section>

      <Section title="Changes">
        <p>We may update these terms. The date at the top shows when they last changed, and continuing to use Invento means you accept the current version.</p>
      </Section>
    </LegalLayout>
  )
}
