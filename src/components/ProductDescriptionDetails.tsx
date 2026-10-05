import type { ProductDescriptionSection } from "@/lib/productDescription";

interface ProductDescriptionDetailsProps {
  sections: ProductDescriptionSection[];
}

function InlineText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((part, index) => (
    /^(\*\*[^*]+\*\*|__[^_]+__)$/.test(part)
      ? <strong key={index} className="font-semibold text-gray-800">{part.slice(2, -2)}</strong>
      : part
  ))}</>;
}

function HighlightText({ text }: { text: string }) {
  if (/\*\*[^*]+\*\*|__[^_]+__/.test(text)) return <InlineText text={text} />;
  const separator = text.match(/\s[—–]\s/);
  if (!separator || separator.index === undefined) return <>{text}</>;
  return <><strong className="font-semibold text-gray-800">{text.slice(0, separator.index)}</strong>{text.slice(separator.index)}</>;
}

export default function ProductDescriptionDetails({ sections }: ProductDescriptionDetailsProps) {
  if (sections.length === 0) return null;

  return (
    <div className="px-4 py-5 sm:px-6">
        <div className="space-y-8">
          {sections.map((section, sectionIndex) => (
            <div key={`${section.title}-${sectionIndex}`}>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">{section.title}</h3>
              <div className="space-y-3 text-sm leading-7 text-gray-600 break-words">
                {section.blocks.map((block, blockIndex) => {
                  if (block.type === "paragraph") return <p key={blockIndex} className="max-w-3xl"><InlineText text={block.text} /></p>;
                  if (block.type === "list") return (
                    <ul key={blockIndex} className="grid gap-x-8 gap-y-3 pl-5 list-disc sm:grid-cols-2 marker:text-purple-500">
                      {block.items.map((item, itemIndex) => <li key={itemIndex}><HighlightText text={item} /></li>)}
                    </ul>
                  );
                  return (
                    <dl key={blockIndex} className="divide-y divide-gray-100 border-y border-gray-200">
                      {block.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-6">
                          <dt className="font-medium text-gray-800">{item.label}</dt>
                          <dd><InlineText text={item.value} /></dd>
                        </div>
                      ))}
                    </dl>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
    </div>
  );
}
