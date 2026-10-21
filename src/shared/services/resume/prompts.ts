import { createResumeEditor } from './editor';
import { isPartialResumeRewrite } from './model-schema';
import { createDeterministicDiagnosis } from './scoring';
import { getResumeRewriteStyle, getResumeTemplate } from './templates';
import { ResumeRequestContext } from './types';
import {
  getResumeLayoutTemplate,
  getResumeVisualTheme,
} from './visual-templates';

function localeInstruction(locale?: string) {
  return locale === 'en'
    ? 'Return all user-facing content in concise professional English.'
    : '请使用自然、专业的中文输出。';
}

function sharedContext(input: ResumeRequestContext, paragraphSource = false) {
  const template = getResumeTemplate(input.templateId);
  const style = getResumeRewriteStyle(input.styleId);
  const layout = getResumeLayoutTemplate(input.layoutTemplateId);
  const visualTheme = getResumeVisualTheme(input.visualThemeId);

  return {
    template,
    style,
    text: [
      `目标岗位 / 方向：${input.targetRole || '用户未填写'}`,
      `目标 JD：${input.jdText || '用户未提供 JD，仅根据岗位方向判断'}`,
      paragraphSource
        ? '简历原文：以下输入段落数组是唯一事实来源。'
        : `简历原文：${input.resumeText}`,
      `投递场景：${template.title}。${template.strategy} ${template.instruction}`,
      `修改风格：${style.title}。${style.instruction}`,
      `排版模板：${layout.title}。${layout.description}。必须使用单栏结构，模块顺序参考：${layout.previewSections.join('、')}。`,
      `视觉主题：${visualTheme.title}。${visualTheme.description}。内容仍需保持清晰、克制、适合 HR 快速阅读。`,
      localeInstruction(input.locale),
      '必须保持事实真实，不要编造工作经历、公司、学历、项目、指标或技能。',
      '不得推测或新增简历未提供的数字、范围、规模、结果或事实。可以展开已有事实的表达；缺失数字只允许使用明确的待填写占位符，未证实的工作内容放入“需要用户确认”，不得将其写成简历中的既成事实。',
    ].join('\n\n'),
  };
}

export function buildDiagnosisPrompt(input: ResumeRequestContext) {
  const context = sharedContext(input);
  const fallback = createDeterministicDiagnosis(input);

  return [
    '你是资深招聘顾问和简历优化专家。请诊断候选人简历与目标岗位的匹配程度。',
    context.text,
    '诊断必须基于简历原文和目标岗位要求，避免泛泛而谈。核心问题最多 5 个，每个问题都要引用原文证据或明确说明未找到对应表达。不要建议把“协助 / 参与”直接升级为“主导 / 独立负责”；缺少独立职责证据时，应询问本人实际范围，保留原有职责强度。',
    '求职方向、意向岗位、目标岗位等意向字段不能作为候选人已有能力或经历的证据；单独的年份、日期和指标名称不算业务成果。',
    '问题优先级只能使用 must、recommended、optional，分别表示必须修改、建议修改、可选优化。',
    'keywordGapDetails 必须解释关键词为什么重要，不能只重复关键词本身。',
    '请只返回 JSON，不要返回 Markdown、解释文字或代码块。',
    'JSON schema:',
    `{
  "score": number,
  "level": "low" | "medium" | "high",
  "summary": string,
  "fitConclusion": {
    "currentDirection": string,
    "targetNeeds": string,
    "mainGap": string
  },
  "issueDetails": [{
    "title": string,
    "description": string,
    "evidence": string,
    "impact": string,
    "suggestion": string,
    "priority": "must" | "recommended" | "optional"
  }],
  "keywordGapDetails": [{
    "keyword": string,
    "reason": string,
    "evidence": string
  }],
  "keywordMatches": string[],
  "keywordGaps": string[],
  "strengths": string[],
  "issues": string[],
  "suggestions": string[],
  "sectionScores": {
    "keywords": number,
    "experience": number,
    "ats": number,
    "readability": number
  }
}`,
    `本地初始诊断参考：${JSON.stringify(fallback)}`,
  ].join('\n\n');
}

export function buildOptimizationPrompt(input: ResumeRequestContext) {
  const context = sharedContext(input, true);
  const paragraphs =
    input.paragraphs ??
    createResumeEditor(input.resumeText).paragraphs.map(({ id, text }) => ({
      id,
      text,
    }));
  const sourceChars = paragraphs.map((p) => p.text).join('\n').length;
  return [
    '你是专业简历精修顾问。目标为真实、紧凑的一页简历草稿，而不是摘要或局部改写示例；本次只处理传入段落。',
    context.text,
    '一、事实层与表达层分开：',
    '你必须保持【事实层】100% 忠于原段落：id 是该段原文事实的地址，严禁跨段移动经历，严禁新增结果与程度副词，不得增加实际工作量、项目数量或职责级别。姓名、求职意向、学校、公司职位、独立栏目标题原样保留。',
    '不要把“负责 / 协助 / 参与”升级成“主导 / 独立负责”，原句的“协助 / 参与”责任限定不能因精简而删除。原文只说测试协作，不能改成“保障项目顺利交付”“提高准确率”或“提升效率”；原来的查询背景不能变成已实现的“替代人工查询”结果；不得将“能够使用”改成“熟练”或“精通”。JD 要求不是候选人已做过的工作。',
    '原文凡带有“参与、协助、配合、支持、跟随”等职责边界限定词，改写时必须逐处原样保留该限定词及其修饰的动作，严禁直接替换为独立主导动词。即使同段其他动作仍有限定词，也不能删去某一动作前的限定；例如“参与访谈”必须保留为“参与访谈”，不能缩成“访谈”。',
    '但在【表达层】严禁原样照抄长句！必须将超过 40 字的流水账长句改写为“强动词开头 + 核心动作 + 已有背景”的紧凑短句，删去口语化连接词；每条优先 28-40 字。同一段内短句用句号或分号衔接，由版面自然换行，不给每句强插换行而增加页高。强动词必须匹配原职责，如“协助梳理”“参与复核”，不能借改句式升级职责。',
    '删去口语化代词与冗余铺垫（如“在……期间”“他们”“进行”等），将松散流水账改写为紧凑的书面简历短句；在不丢失任何已知业务细节与名单的前提下，将长文字符适度精简 10%～25%。保留对象、工具、责任边界、关键动作及完整名单（例如“人事、行政和销售支持”不得缩为“业务部门”）；原文的否定职责边界可简洁表达，不能反转为已承担的职责。事实保护优先，不为达到比例删掉细节，排版容量由共用排版逻辑处理。',
    '表达精简需有实质变化，不能只去掉一两个“的”字或逐字复述。逐段检查长正文中的铺垫、代词、重复谓语和口语从句，改为书面短句；精简应覆盖各长正文段落，不仅修改其中一段。提交前按输入与输出正文字符复核上述适度精简目标；标题、名单、职责限定、否定边界和已知细节不计作可删冗余。',
    '原文的并列清单应完整保留每一项，不得概括省略：如“资料质量、搜索入口或交互说明”不能缩成“问题归属”，“输入问题”不能缩成“输入”，“反馈入口”不能缩成“反馈位置”。“未提供/未声明”表示信息缺失，不等于没有数据或没有职责，不能改成“无数据/无职责”。',
    '改写示例：原文“针对同一个问题在不同文档中表述不一致的情况，整理来源说明与版本备注，与业务资料维护人确认有效内容。把确认结论写入问题记录，供研发和测试同事判断检索结果是否引用了适用资料。”可改为“针对同一问题的跨文档表述差异，整理来源说明与版本备注，向业务资料维护人确认有效内容；记录确认结论，供研发、测试判断检索引用是否适用。”示例仅说明句式，不能把示例事实移入其他段落。',
    input.rewriteScope === 'full' || !input.rewriteScope
      ? '本次是全篇段落。长文按上述 10%～25% 的表达精简目标处理，不要求为一页硬删字。资料短缺时不硬扩写，summary 明确“补充资料后可完善一页”。精简比例不等于实际分页保证。'
      : '本次仅处理未锁定或指定段落，不适用整份一页的字数预算；单段不扩成整份简历。仅压缩该段，不新增栏目。',
    '使用 STAR/CAR 组织原文已有的背景、任务与动作；只有原文明确支持时才保留结果。没有结果就不造 Result，不能因为简历需要成果而补造。',
    '二、已知信息保护与数字槽位：',
    '严禁将原文已经明确提及的部门名称（如人事、行政）、工具名称或具体业务名词替换为 slot；slot 仅可用于原文完全缺失的数字、频率、规模或百分比。已知数字同样保留，不重新变成填空。',
    '不得估算或补写数字，具体数字由简历主人自己填写。原文无改善证据时，不得设置暗示已经提升或降低的百分比槽位。',
    '例如原文“访谈人事、行政同事，整理问题”，可以改成“访谈人事、行政同事{{interview_count}}，整理问题”。槽位只表示可省略的完整计数短语（括号、数量、单位均包含在槽位内），fallbackText 为空；提示本人填写完整的真实计数短语。不能把“人事、行政同事”替换成槽位。',
    '严禁“共计{{count}}人次”或把单位留在槽位外；不能用“多位”“多轮”“大幅提升”替代未知数字。所有槽位先用 fallbackText 替换自检，句子必须通顺、没有残留单位或多余标点。',
    '正文使用 {{slot_id}}，并在 slots 中提供唯一 id、中文 label、prompt、fallbackText。优先只放 2-4 个确有必要的数字槽位，不为凑数量添加占位，不输出旧【待填写】格式。若数字短语可省略，fallbackText 为空；否则只用不增加事实且有原文依据的中性表达。',
    '未证实的工作内容放入“需要用户确认”。根据职业方向提供条件式补充问题，先由本人确认再补入简历；不能直接写入正文。例如硬件原文只写仪器校准和 RS-485 联调时，不能擅自补入 PCB 设计、EMC 测试、BOM 管理。',
    '三、写回与精简输出：',
    `必须返回每个输入 id，数量一致、不得新增、遗漏或改 id；每个 text 必须非空。不重排、不跨段合并；标题和公司行也必须单独返回。输入 id 顺序为：${paragraphs.map((p) => p.id).join('、')}。`,
    '正文只返回 paragraphs 数组，每项只有 id、text；整篇正文由后端拼接，不要再输出另一份全文。不要返回诊断评分、重复的确认字段或额外报告。',
    isPartialResumeRewrite(input)
      ? '本次局部请求不返回 title；后端保留原草稿标题。'
      : 'title 使用原姓名与目标岗位，最多120字符，不写优化报告等说明性标题。',
    '其余字段只有 summary、slots、changes、confirmationItems、changeNotes。changes 仅列关键修改，包含 original、revised、type、reason、needsConfirmation；type 为 expression/structure/keyword/quantification/focus/deletion/risk。引用真实原句，不伪造原文。确认项包含 category、item、reason；category 为 metric/skill/scope/credential/experience/evidence。',
    '只返回符合 response_format JSON Schema 的 JSON，不要 Markdown、解释或代码块；只输出最终内容，不输出内部分析。',
    `输入段落：${JSON.stringify(paragraphs)}`,
    `已有待确认数字槽位：${JSON.stringify(input.slots ?? [])}`,
    sourceChars > 1000
      ? `本次长文输入正文 ${sourceChars} 字符。表达优化参考区间为 ${Math.ceil(sourceChars * 0.75)}～${Math.floor(sourceChars * 0.9)} 字符（不含槽位标识符）；优先接近 ${Math.round(sourceChars * 0.85)} 字符。请在保留上述全部事实与清单的前提下，逐段重组冗长句法以达到适度精简；不通过删除名单、职责边界或否定说明凑比例。`
      : '短资料不强行套用长文精简比例。',
  ].join('\n\n');
}
