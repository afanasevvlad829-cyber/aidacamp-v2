import { trackGoal } from './analytics';

import { MAILRU_PIXEL_ID } from '../data/tracking';

/** Submit a lead to /api/lead and fire tracking pixels */
export async function submitLead(data: {
  phone: string;
  age: string;
  shift?: string;
  source?: string;
  form?: string;
}): Promise<boolean> {
  trackGoal('form_submit', { form: data.form || 'booking', age: data.age });

  try {
    await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: data.phone,
        age: data.age,
        shift: data.shift || '',
        source: data.source || new URLSearchParams(window.location.search).get('utm_source') || '',
      }),
    });

    if (typeof _tmr !== 'undefined') {
      _tmr.push({ type: 'reachGoal', id: MAILRU_PIXEL_ID, value: 6375, goal: 'lead' });
    }

    return true;
  } catch {
    return false;
  }
}

declare const _tmr: Array<Record<string, unknown>> | undefined;
