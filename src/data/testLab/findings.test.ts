import { describe, it, expect } from 'vitest';
import { parseCsv, parseTaskResultsCsv, aggregateFindings } from './findings';

const CSV = [
  'sessionId,preview,participantName,taskId,outcome,verified,durationMs,hintsUsed,easeRating,comprehensionCorrect,comprehensionAnswer,giveUpReason,routeTrail',
  's1,FALSE,Ana,ga-billing-total,verified,TRUE,60000,0,6,TRUE,Right answer,,"[{""route"":""/a"",""at"":1}]"',
  's2,FALSE,Ben,ga-billing-total,gave-up,FALSE,20000,1,,,,Couldn\'t find where,"[]"',
  's3,FALSE,Cy,ga-billing-total,claimed,FALSE,40000,0,4,FALSE,The moment the order is placed,,"[]"',
  's4,TRUE,Preview,ga-billing-total,verified,TRUE,10000,0,7,TRUE,Right answer,,"[]"',
  's1,FALSE,Ana,ga-delete,verified,TRUE,90000,2,5,TRUE,Right answer,,"[]"',
].join('\n');

describe('findings', () => {
  it('parses quoted JSON fields without splitting on inner commas', () => {
    const rows = parseCsv(CSV);
    expect(rows[1][rows[0].indexOf('routeTrail')]).toBe('[{"route":"/a","at":1}]');
  });

  it('maps rows by header name, not position', () => {
    const rows = parseTaskResultsCsv(CSV);
    expect(rows).toHaveLength(5);
    expect(rows[1].giveUpReason).toBe("Couldn't find where");
    expect(rows[2].comprehensionAnswer).toBe('The moment the order is placed');
  });

  it('excludes preview rows by default and computes per-task stats', () => {
    const findings = aggregateFindings(parseTaskResultsCsv(CSV));
    const total = findings.find(f => f.taskId === 'ga-billing-total')!;
    expect(total.n).toBe(3); // preview row excluded
    expect(total.verifiedPct).toBe(33);
    expect(total.gaveUpPct).toBe(33);
    expect(total.medianDurationS).toBe(40);
    expect(total.meanEase).toBe(5); // (6+4)/2
    expect(total.comprehensionPct).toBe(50); // 1 of 2 answered rows
    expect(total.misconceptions).toEqual([{ answer: 'The moment the order is placed', count: 1 }]);
    expect(total.giveUpReasons).toEqual([{ reason: "Couldn't find where", count: 1 }]);
  });

  it('sorts worst task first', () => {
    const findings = aggregateFindings(parseTaskResultsCsv(CSV));
    expect(findings[0].taskId).toBe('ga-billing-total'); // 33% < 100%
    expect(findings[1].taskId).toBe('ga-delete');
  });

  it('includePreview folds preview rows back in', () => {
    const findings = aggregateFindings(parseTaskResultsCsv(CSV), { includePreview: true });
    expect(findings.find(f => f.taskId === 'ga-billing-total')!.n).toBe(4);
  });
});
