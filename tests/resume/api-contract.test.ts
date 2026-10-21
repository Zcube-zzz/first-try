import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { POST as diagnosePost } from '@/app/api/resume/diagnose/route';
import { POST as exportPost } from '@/app/api/resume/export/route';
import { POST as optimizePost } from '@/app/api/resume/optimize/route';
import { POST as parsePost } from '@/app/api/resume/parse/route';

function readZipEntry(zip: Buffer, entryName: string) {
  let offset = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const directoryOffset = zip.readUInt32LE(offset + 16);
  const entryCount = zip.readUInt16LE(offset + 10);
  offset = directoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(zip.readUInt32LE(offset), 0x02014b50);
    const compression = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.toString('utf8', offset + 46, offset + 46 + nameLength);

    if (name === entryName) {
      const localNameLength = zip.readUInt16LE(localOffset + 26);
      const localExtraLength = zip.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const data = zip.subarray(dataOffset, dataOffset + compressedSize);
      return compression === 8
        ? inflateRawSync(data).toString('utf8')
        : data.toString('utf8');
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  throw new Error(`Missing DOCX entry: ${entryName}`);
}

async function main() {
  const syntheticResume = [
    '求职方向：增长产品经理',
    '教育背景：虚构大学，信息管理专业，2024届',
    '实习经历：虚构电商平台｜产品运营实习生',
    '在4周内整理120条用户反馈，按新手引导、搜索、商品信息和交易沟通4类归档；协助产品同学梳理8项小程序活动需求，负责跟进设计稿与研发排期，并参与2轮上线检查。',
    '活动复盘：统计活动页访问量2400次、有效咨询360次，按有效咨询/访问计算转化率为15%；仅参与数据整理与复盘，不负责活动策略和最终业务指标。',
    '项目经历：校园二手交易活动，参与活动页面配置和上线检查。',
    '技能：Excel、基础SQL。',
  ].join('\n');
  const syntheticJd =
    '负责用户增长策略、需求分析、数据复盘和跨部门推进；关注新用户转化率、留存率，能通过实验持续改进增长效果。';

  const badParse = await parsePost(
    new Request('http://test/api/resume/parse', {
      method: 'POST',
      body: new FormData(),
    })
  );
  const badParseJson = await badParse.json();
  assert.equal(badParseJson.code, -1);

  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  const diagnose = await diagnosePost(
    new Request('http://test/api/resume/diagnose', {
      method: 'POST',
      body: JSON.stringify({
        resumeText: syntheticResume,
        targetRole: '增长产品经理',
        jdText: syntheticJd,
        locale: 'zh',
      }),
    })
  );
  const diagnoseJson = await diagnose.json();
  assert.equal(diagnoseJson.code, 0);
  assert.equal(typeof diagnoseJson.data.score, 'number');

  const optimize = await optimizePost(
    new Request('http://test/api/resume/optimize', {
      method: 'POST',
      body: JSON.stringify({
        resumeText: syntheticResume,
        targetRole: '增长产品经理',
        jdText: syntheticJd,
        templateId: 'product-manager',
        styleId: 'achievement-focused',
        layoutTemplateId: 'product-results',
        visualThemeId: 'business-blue',
        locale: 'zh',
      }),
    })
  );
  globalThis.fetch = previousFetch;

  const optimizeJson = await optimize.json();
  assert.equal(optimizeJson.code, 0);
  assert.equal(optimizeJson.data.rewrittenResume.includes('主导'), false);
  assert.equal(optimizeJson.data.rewrittenResume, syntheticResume);
  assert.equal(Array.isArray(optimizeJson.data.changes), true);
  assert.equal(optimizeJson.data.changes.length, 0);
  assert.equal(Array.isArray(optimizeJson.data.confirmationItems), true);
  assert.equal(Array.isArray(optimizeJson.data.changeNotes), true);

  const exported = await exportPost(
    new Request('http://test/api/resume/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '虚构候选人简历',
        rewrittenResume: optimizeJson.data.rewrittenResume,
        summary: '仅供网页展示的优化说明',
        changeNotes: ['仅供网页展示的修改记录'],
        factsToConfirm: ['未确认的 PCB 设计经历不能进入正文'],
        layoutTemplateId: 'product-results',
        visualThemeId: 'business-blue',
      }),
    })
  );
  assert.equal(exported.status, 200);
  assert.match(
    exported.headers.get('content-type') ?? '',
    /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/
  );
  const docx = Buffer.from(await exported.arrayBuffer());
  const documentXml = readZipEntry(docx, 'word/document.xml');
  assert.match(documentXml, /校园二手交易活动/);
  assert.match(documentXml, /15%/);
  assert.match(readZipEntry(docx, 'docProps/core.xml'), /产品成果版/);
  assert.match(readZipEntry(docx, 'word/styles.xml'), /17365D/);
  assert.match(readZipEntry(docx, 'word/styles.xml'), /Microsoft YaHei/);
  assert.match(documentXml, /w:w="11906" w:h="16838"/);
  assert.doesNotMatch(
    documentXml,
    /仅供网页展示|未确认的 PCB|简历内容|本次修改|需要确认|产品成果版/
  );

  const hierarchyExport = await exportPost(
    new Request('http://test/api/resume/export', {
      method: 'POST',
      body: JSON.stringify({
        title: '虚构层级检查',
        rewrittenResume:
          '虚构候选人\n工作经历\n虚构公司｜硬件助理\n协助测试，记录问题。',
      }),
    })
  );
  assert.equal(hierarchyExport.status, 200);
  const hierarchyXml = readZipEntry(
    Buffer.from(await hierarchyExport.arrayBuffer()),
    'word/document.xml'
  );
  const hierarchyParagraphs = Array.from(
    hierarchyXml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g),
    (match) => match[0]
  );
  assert.equal(hierarchyParagraphs.length, 4);
  for (const index of [0, 1, 2]) {
    assert.match(hierarchyParagraphs[index], /<w:b\/>/);
    assert.match(hierarchyParagraphs[index], /<w:bCs\/>/);
  }
  assert.match(hierarchyParagraphs[1], /<w:bottom[^>]*w:sz="8"/);
  assert.match(hierarchyParagraphs[3], /<w:b w:val="false"\/>/);
  assert.doesNotMatch(hierarchyParagraphs[3], /<w:b\/>/);

  const pendingExport = await exportPost(
    new Request('http://test/api/resume/export', {
      method: 'POST',
      body: JSON.stringify({
        title: '虚构候选人',
        rewrittenResume: '协助处理{{slot_test_1}}',
      }),
    })
  );
  assert.equal(pendingExport.status, 400);
  for (const paragraphs of [
    [{ id: 'bad', text: '测试' }],
    [
      { id: 'p_1', text: '测试' },
      { id: 'p_1', text: '重复' },
    ],
  ]) {
    const response = await optimizePost(
      new Request('http://test/api/resume/optimize', {
        method: 'POST',
        body: JSON.stringify({ resumeText: '测试', paragraphs }),
      })
    );
    assert.equal((await response.json()).code, -1);
  }
  const draftExport = await exportPost(
    new Request('http://test/api/resume/export', {
      method: 'POST',
      body: JSON.stringify({
        title: '虚构硬件候选人',
        rewrittenResume:
          '虚构姓名\n专业技能\n协助校准【待填写：设备台数】台设备',
      }),
    })
  );
  assert.equal(draftExport.status, 200);
  assert.ok(
    draftExport.headers
      .get('content-disposition')
      ?.includes(encodeURIComponent('待填写草稿'))
  );
  assert.match(
    readZipEntry(
      Buffer.from(await draftExport.arrayBuffer()),
      'word/document.xml'
    ),
    /【待填写：设备台数】/
  );
}

main();
