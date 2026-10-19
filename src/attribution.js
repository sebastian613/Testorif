/** Credit travels with reproduced translations, never with Hebrew-only results. */
export function translationAttribution(corpus, passages) {
  const credit = corpus.translationCredit;
  if (!credit || !passages.some((passage) => passage?.en)) return "";
  return `${credit.title} by ${credit.creator}, via Sefaria. ${credit.license}: ${credit.licenseUrl} Source: ${credit.sourceUrl} Original source: ${credit.originalSourceUrl} ${credit.changes}`;
}

export function resultAttribution(corpus, passages) {
  return [passages.length ? corpus.sourceCredit : "", translationAttribution(corpus, passages)]
    .filter(Boolean).join("\n");
}
