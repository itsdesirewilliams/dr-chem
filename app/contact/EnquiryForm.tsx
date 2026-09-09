'use client';

import { useState, type FormEvent } from 'react';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const inputClass =
  'w-full min-h-11 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-jade-600 focus:outline-none focus:ring-2 focus:ring-jade-600/20';

export default function EnquiryForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    setStatus('submitting');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(data.get('name') ?? ''),
          email: String(data.get('email') ?? ''),
          company: String(data.get('company') ?? '') || undefined,
          subject: String(data.get('subject') ?? '') || undefined,
          productRef: String(data.get('productRef') ?? '') || undefined,
          message: String(data.get('message') ?? ''),
        }),
      });

      if (res.ok) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
        setErrorMessage(
          'Your enquiry could not be sent. Please email us directly or try again.',
        );
      }
    } catch {
      setStatus('error');
      setErrorMessage(
        'A network error occurred. Please check your connection and try again.',
      );
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-jade-200 bg-jade-50 p-6 text-center">
        <h3 className="font-display text-xl font-semibold text-jade-900">
          Enquiry sent
        </h3>
        <p className="mt-2 text-sm text-jade-800">
          Thank you — the DR-Chem team has received your message and will get
          back to you.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-jade-300 px-5 text-sm font-semibold text-jade-800 hover:bg-jade-100"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-neutral-800">
            Name <span className="text-red-600">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your full name"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-neutral-800">
            Email <span className="text-red-600">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="company" className="mb-1.5 block text-sm font-semibold text-neutral-800">
            Company
          </label>
          <input
            id="company"
            name="company"
            type="text"
            autoComplete="organization"
            placeholder="Optional"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="subject" className="mb-1.5 block text-sm font-semibold text-neutral-800">
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            placeholder="e.g. Bulk pricing request"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="productRef" className="mb-1.5 block text-sm font-semibold text-neutral-800">
            Product reference
          </label>
          <input
            id="productRef"
            name="productRef"
            type="text"
            placeholder="Article number or CAS number (optional)"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="message" className="mb-1.5 block text-sm font-semibold text-neutral-800">
            Message <span className="text-red-600">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            placeholder="What do you need? Include quantities, pack sizes or any specifications."
            className={`${inputClass} resize-y`}
          />
        </div>
      </div>

      {status === 'error' && errorMessage && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-jade-700 px-8 text-sm font-semibold text-white transition hover:bg-jade-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === 'submitting' ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  );
}
