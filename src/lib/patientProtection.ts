import { randomBytes } from 'crypto';

export const patientSpecificNotice = 'Esta tarea parece estar relacionada con un paciente concreto. FarmaHub360 no debe utilizarse como registro clínico ni como hoja de elaboración. Los datos identificativos y clínicos deben registrarse en el sistema corporativo correspondiente. En FarmaHub360 solo debe quedar una referencia organizativa no identificativa.';
export const patientIdentifierReplacedNotice = 'Se ha sustituido un posible identificador de paciente antes de guardar.';
export const patientIdentityNotice = 'La identificación del paciente debe realizarse exclusivamente en el sistema corporativo autorizado.';
export const internalDocumentNotice = 'Documento de gestión interna. La identificación del paciente, si procede, debe realizarse en el sistema corporativo autorizado.';

const patientKeywordPattern = /\b(NHC|historia|paciente|DNI|CIP|NUHSA|SIP)\b/i;
const patientIdentifierPattern = /\b(?:NHC|historia(?:\s+cl[ií]nica)?|DNI|CIP|NUHSA|SIP|c[oó]digo\s+paciente)\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{4,})\b/gi;

export function generatePacReference() {
  return `PAC-${randomBytes(6).toString('hex').toUpperCase()}`;
}

export function containsPatientSpecificText(...values: Array<string | null | undefined>) {
  return values.some((value) => patientKeywordPattern.test(value ?? ''));
}

export function sanitizePatientIdentifiers(value: string | null | undefined, replacement = generatePacReference()) {
  const input = value ?? '';
  let replaced = false;
  const text = input.replace(patientIdentifierPattern, () => {
    replaced = true;
    return replacement;
  });
  return { text, replaced };
}

export function patientWarningParams(wasPatientSpecific: boolean, wasSanitized: boolean) {
  const params: Record<string, string> = {};
  if (wasPatientSpecific) params.patientWarning = '1';
  if (wasSanitized) params.sanitized = '1';
  return params;
}
