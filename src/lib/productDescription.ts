export type ProductDescriptionBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "specifications"; items: { label: string; value: string }[] };

export interface ProductDescriptionSection {
  title: string;
  blocks: ProductDescriptionBlock[];
}

interface ProductDescription {
  intro: string;
  sections: ProductDescriptionSection[];
}

const SECTION_TITLES: Record<string, string> = {
  "key technology & features": "Highlights",
  "key features": "Highlights",
  features: "Highlights",
  highlights: "Highlights",
  "why you’ll love it": "Highlights",
  "why you'll love it": "Highlights",
  "ideal for": "Intended use",
  "intended use": "Intended use",
  specifications: "Specifications",
  "technical specifications": "Specifications",
  specs: "Specifications",
  "performance architecture": "Performance architecture",
};

const SPECIFICATION_LABELS = new Set([
  "weight", "midsole", "foam technology", "plate", "energy feedback",
  "outsole", "anti-torsion torque", "primary use", "heel drop", "stack height",
]);

/** Format existing plain text without generating or discarding product claims. */
export function parseProductDescription(description: string): ProductDescription {
  const sections: ProductDescriptionSection[] = [];
  let currentSection: ProductDescriptionSection = { title: "Overview", blocks: [] };
  sections.push(currentSection);
  let intro = "";

  for (const rawLine of description.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const headingKey = line.replace(/:$/, "").toLowerCase();
    const heading = Object.hasOwn(SECTION_TITLES, headingKey) ? SECTION_TITLES[headingKey] : undefined;
    if (heading) {
      currentSection = { title: heading, blocks: [] };
      sections.push(currentSection);
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      const previousBlock = currentSection.blocks.at(-1);
      if (previousBlock?.type === "list") previousBlock.items.push(bullet[1]);
      else currentSection.blocks.push({ type: "list", items: [bullet[1]] });
      continue;
    }

    const specification = line.match(/^([^:]{1,48}):\s+(.+)$/);
    if (specification && (currentSection.title === "Specifications" || SPECIFICATION_LABELS.has(specification[1].toLowerCase()))) {
      if (currentSection.title !== "Specifications") {
        currentSection = { title: "Specifications", blocks: [] };
        sections.push(currentSection);
      }
      const item = { label: specification[1], value: specification[2] };
      const previousBlock = currentSection.blocks.at(-1);
      if (previousBlock?.type === "specifications") previousBlock.items.push(item);
      else currentSection.blocks.push({ type: "specifications", items: [item] });
      continue;
    }

    if (!intro && currentSection.title === "Overview") intro = line;
    currentSection.blocks.push({ type: "paragraph", text: line });
  }

  if (intro.length > 240) {
    const cutAt = intro.lastIndexOf(" ", 240);
    intro = `${intro.slice(0, cutAt > 0 ? cutAt : 240)}…`;
  }

  return { intro, sections: sections.filter((section) => section.blocks.length > 0) };
}
