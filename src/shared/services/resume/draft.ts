import type { ResumeSlot } from './types';

// Old saved drafts remain readable while new responses use structured slots.
export function getResumeFillInFields(text: string): string[] {
  return [
    ...new Set(
      Array.from(
        text.matchAll(
          /【待(?:填写|确认)(?:\s+\d+)?[：:]([^】\r\n]+)】|{{([^{}\r\n]+)}}/g
        ),
        (match) => (match[1] ?? match[2]).trim()
      ).filter(Boolean)
    ),
  ];
}

export function normalizeResumeSlots(
  texts: string[],
  rawSlots: unknown,
  source: string,
  prefix: string
) {
  const supplied = new Map<string, Partial<ResumeSlot>>();
  if (Array.isArray(rawSlots)) {
    for (const slot of rawSlots) {
      if (slot && typeof slot.id === 'string' && !supplied.has(slot.id))
        supplied.set(slot.id, slot);
    }
  }
  const slots: ResumeSlot[] = [];
  const ids = new Map<string, string>();
  const neutralFallbacks = new Set([
    '',
    '相关设备',
    '相关仪器',
    '相关记录',
    '相关项目',
    '相关工作',
    '相关任务',
    '相关内容',
    '相关批次',
  ]);
  const replace = (key: string, legacy = false, unit = '') => {
    if (!ids.has(key)) {
      const metadata = supplied.get(key);
      const label =
        typeof metadata?.label === 'string' && metadata.label.trim()
          ? metadata.label.trim().slice(0, 100)
          : legacy
            ? key
            : '待确认信息';
      const proposed =
        typeof metadata?.fallbackText === 'string'
          ? metadata.fallbackText.trim().slice(0, 200)
          : unit.startsWith('台')
            ? '相关设备'
            : unit.startsWith('批')
              ? '相关批次'
              : '';
      const fallbackText =
        neutralFallbacks.has(proposed) ||
        (proposed.length > 0 && source.includes(proposed))
          ? proposed
          : '';
      const id = `${prefix}_${slots.length + 1}`;
      ids.set(key, id);
      slots.push({
        id,
        sourceId: key,
        label,
        prompt:
          typeof metadata?.prompt === 'string' && metadata.prompt.trim()
            ? metadata.prompt.trim().slice(0, 300)
            : `请填写${label}的真实数据和必要单位；无法核实时选择暂无数据。`,
        fallbackText,
      });
    }
    return `{{${ids.get(key)}}}`;
  };
  const normalized = texts.map((text) =>
    text
      .replace(
        /【待填写[：:]([^】\r\n]+)】(台设备|台仪器|批试产|台|批|次|项|条|人|%|％)?/g,
        (_, label: string, unit: string) =>
          replace(label.trim(), true, unit ?? '')
      )
      .replace(
        /((?:共计|合计|总计|累计|约)\s*)?{{([^{}\r\n]{1,128})}}(台设备|台仪器|人次|轮|次|台|批|条|项|个|人|%|％)?/g,
        (
          token,
          prefix: string | undefined,
          key: string,
          unit: string | undefined
        ) => {
          if (slots.some((slot) => slot.id === key)) return token;
          const replacement = replace(key.trim(), false, unit ?? '');
          const slot = slots.find((item) => item.id === ids.get(key.trim()))!;
          // Old numeric-only slots must also own their quantifier and unit.
          if (prefix || unit)
            slot.prompt =
              `${slot.prompt} 请填写完整短语，包含${prefix || ''}真实数量及${unit || '必要单位'}，不要只填写数字。`.slice(
                0,
                300
              );
          return replacement;
        }
      )
  );
  return { texts: normalized, slots };
}

export function formatResumeSlotLabels(
  text: string,
  slots: ResumeSlot[],
  locale: 'zh' | 'en' = 'zh'
) {
  const labels = new Map(
    slots.flatMap(
      (slot) =>
        [
          [slot.id, slot.label],
          ...(slot.sourceId ? [[slot.sourceId, slot.label]] : []),
        ] as [string, string][]
    )
  );
  return text.replace(/{{([^{}\r\n]+)}}/g, (_token, id: string) => {
    const label =
      labels.get(id.trim()) ||
      (locale === 'zh' ? '待确认信息' : 'Unconfirmed information');
    return locale === 'zh' ? `【待补充：${label}】` : `[To fill: ${label}]`;
  });
}
