export function inspectResumeText(text: string) {
  const characters = Array.from(text.trim());
  // Numbers, common engineering units and contact punctuation are readable too.
  const readable =
    /[\p{Script=Han}\p{Script=Latin}0-9\s.,，。!?！？:：;；、()（）\[\]【】{}《》<>“”"'‘’\-—–_+/%％@#&=\\|·•~～…￥$^°℃Ωμ±≤≥]/u;
  const unreadableCount = characters.filter(
    (character) => !readable.test(character)
  ).length;
  const characterCount = characters.length;
  const unreadableRatio = characterCount ? unreadableCount / characterCount : 0;
  return {
    characterCount,
    unreadableRatio,
    isLowQuality: characterCount < 50 || unreadableRatio > 0.15,
  };
}
