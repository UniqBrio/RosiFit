import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Button, Divider } from '../../src/components/ui';
import { Field, Stepper } from '../../src/components/Field';
import { SPACE } from '../../src/theme/tokens';
import { COURSE_LIST } from '../../src/data/mock';

/** C-56/C-57. Four fields. No fee, no short code — no commercial fields at all. */
export default function EditCourse() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = COURSE_LIST.find(c => c.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [start, setStart] = useState(existing?.start_time ?? '');
  const [end, setEnd] = useState(existing?.end_time ?? '');
  const [freq, setFreq] = useState(existing?.frequency ?? 4);

  const nameOk = name.trim().length >= 2;
  const timeRe = /^([01]?\d|2[0-3]):[0-5]\d$/;
  const startBad = start.length > 0 && !timeRe.test(start);
  const endBad = end.length > 0 && !timeRe.test(end);
  const orderBad = !startBad && !endBad && start && end && end <= start;

  return (
    <Screen>
      <H1>{existing ? 'Edit course' : 'Add course'}</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>Name, timing and intended frequency.</Muted>

      <Card>
        <Field label="Course name" value={name} onChange={setName} placeholder="e.g. Prenatal Fitness"
          error={name.length > 0 && !nameOk ? 'Enter at least 2 characters.' : undefined} />
        <Field label="Start time" value={start} onChange={setStart} placeholder="06:00"
          error={startBad ? 'Use 24-hour time, e.g. 06:00.' : undefined}
          hint="Used as the default when you add this course at a branch. Existing offerings keep their own times." />
        <Field label="End time" value={end} onChange={setEnd} placeholder="07:00"
          error={endBad ? 'Use 24-hour time, e.g. 07:00.'
               : orderBad ? 'End time must be after the start time.' : undefined} />
        <Divider />
        <Stepper label="Frequency (sessions per week)" value={freq} onChange={setFreq} min={1} max={7} />
        {/* CR-07 stated on the form itself, so nobody expects it to drive counts */}
        <Muted>
          Frequency states your intent. Attendance is never counted from it — it comes from the
          weekdays set on each offering. If an offering runs fewer days, the course screen says so
          and keeps counting the real days.
        </Muted>
      </Card>

      <Card>
        <H2>Not on this form</H2>
        <Body style={{ marginTop: SPACE.sm }}>
          There is no course fee and no short code. RosiFit does not handle money in this app,
          so no commercial field is collected anywhere.
        </Body>
      </Card>

      <Button label={existing ? 'Save course' : 'Add course'}
        disabled={!nameOk || startBad || endBad || !!orderBad}
        onPress={() => router.back()} />
    </Screen>
  );
}
