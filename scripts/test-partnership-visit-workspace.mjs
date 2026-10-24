import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ui=readFileSync('src/components/crm/PropertyVisitsPanel.tsx','utf8');
assert.ok(!ui.includes('window.prompt'));
assert.ok(ui.includes('verifyVisitPresence'));
assert.ok(ui.includes('captureVisitLocation'));
assert.ok(ui.includes('disputePropertyVisit'));
assert.ok(ui.includes('resolveVisitDispute'));
console.log('Workspace: verificações estruturais passaram. Comportamento coberto por test-property-visits.mjs.');
