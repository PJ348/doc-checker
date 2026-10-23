import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

// ตั้งค่า CORS ให้หน้าเว็บเรียกใช้งานได้
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ฟังก์ชันสกัดชื่อฟอนต์ที่ฝังอยู่ในไฟล์ PDF จริง (ช่วยให้ตรวจชนิดฟอนต์ได้แม่นยำ) หรอ??
function extractPdfFonts(pdfBytes: Uint8Array): string[] {
  try {
    const rawStr = new TextDecoder("latin1").decode(pdfBytes);
    const fontMatches = rawStr.matchAll(/\/BaseFont\s*\/([A-Za-z0-9+,\-_]+)/g);
    const fontSet = new Set<string>();
    for (const match of fontMatches) {
      // ตัดรหัส Subset 6 ตัวอักษรข้างหน้าออก เช่น ABCDEF+THSarabunNew เป็น THSarabunNew
      const cleanFontName = match[1].replace(/^[A-Z]{6}\+/, "");
      if (cleanFontName) fontSet.add(cleanFontName);
    }
    return Array.from(fontSet);
  } catch (_) {
    return [];
  }
}

serve(async (req) => {
  // จัดการ Preflight request สำหรับ CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // รับค่าที่หน้าเว็บส่งมา
    const { submission_id, file_url } = await req.json()

    if (!submission_id || !file_url) {
      throw new Error("จำเป็นต้องส่ง submission_id และ file_url");
    }

    // เชื่อมต่อฐานข้อมูล Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ดึง format_id + ชื่อมาตรฐานเอกสารจากฐานข้อมูล
    const { data: subData, error: subError } = await supabase
        .from('document_submission')
        .select(`
            project_id,
            submission_number,
            file_link,
            format_id,
            document_format ( document_name, file_url )
        `)
        .eq('submission_id', submission_id)
        .single();
    if (subError) throw new Error("ดึงข้อมูลเอกสารไม่สำเร็จ: " + subError.message);

    const projectId = subData?.project_id;
    const currentSubNum = subData?.submission_number || 0;
    const formatId = subData?.format_id;
    
    const mdFileUrl = Array.isArray(subData?.document_format) 
        ? subData?.document_format[0]?.file_url 
        : subData?.document_format?.file_url;

    // ดึงประวัติข้อผิดพลาดและคอมเมนต์อาจารย์จาก "เวอร์ชันก่อนหน้า" (ถ้าเคยส่งมาแล้ว)
    let previousIssuesText = "ไม่มี (นี่คือการส่งตรวจครั้งแรก)";
    if (projectId) {
        // หาเวอร์ชันส่งจริงล่าสุดก่อนหน้านี้
        let prevQuery = supabase
            .from('document_submission')
            .select('submission_id, submission_number')
            .eq('project_id', projectId)
            .neq('submission_id', submission_id)
            .gt('submission_number', 0)
            .order('submission_number', { ascending: false })
            .limit(1);

        if (currentSubNum > 0) {
            prevQuery = prevQuery.lt('submission_number', currentSubNum);
        }

        const { data: prevSub } = await prevQuery.maybeSingle();

        if (prevSub) {
            const prevNotes: string[] = [];

            // ดึงข้อผิดพลาดเดิมที่ AI เคยตรวจพบในเวอร์ชันก่อน
            const { data: prevInsp } = await supabase
                .from('ai_inspection')
                .select('ai_inspection_id')
                .eq('submission_id', prevSub.submission_id)
                .maybeSingle();

            if (prevInsp) {
                const { data: prevFailed } = await supabase
                    .from('ai_inspection_result')
                    .select('detected_issues')
                    .eq('ai_inspection_id', prevInsp.ai_inspection_id)
                    .eq('pass_fail_result', false);

                if (prevFailed && prevFailed.length > 0) {
                    prevNotes.push(`ข้อผิดพลาดจาก AI ใน v${prevSub.submission_number}:\n` + 
                        prevFailed.map((f, idx) => `   - ${f.detected_issues}`).join('\n'));
                }
            }

            // ดึงคำแนะนำเดิมของอาจารย์ในเวอร์ชันก่อน
            const { data: prevTeacherFb } = await supabase
                .from('feedback')
                .select('details')
                .eq('submission_id', prevSub.submission_id);

            if (prevTeacherFb && prevTeacherFb.length > 0) {
                prevNotes.push(`คำสั่งแก้ไขจากอาจารย์ใน v${prevSub.submission_number}:\n` + 
                    prevTeacherFb.map(fb => `   - ${fb.details}`).join('\n'));
            }

            if (prevNotes.length > 0) {
                previousIssuesText = prevNotes.join('\n\n');
            }
        }
    }

    // ดึงข้อกำหนดจากตาราง document_requirement ผ่าน consists_of
    let requirementText = "ไม่ได้ระบุข้อกำหนดรายข้อในระบบ";
    if (formatId) {
        const { data: consistsRows, error: reqError } = await supabase
            .from('consists_of')
            .select(`
                document_requirement ( requirement_id, category_name, requirement_details )
            `)
            .eq('format_id', formatId);

        if (!reqError && consistsRows) {
            const requirements = consistsRows
                .map(row => Array.isArray(row.document_requirement) ? row.document_requirement[0] : row.document_requirement)
                .filter(Boolean);

            if (requirements.length > 0) {
                requirementText = requirements
                    .map((r, i) => `${i + 1}. [${r.category_name}] ${r.requirement_details}`)
                    .join('\n');
            }
        }
    }

    // โหลดไฟล์ PDF และแปลงเป็น Base64
    // โหลดไฟล์ .md และแปลงเป็น Text ธรรมดา
    let mdContent = "ไม่มีไฟล์คู่มือเพิ่มเติม";
    if (mdFileUrl) {
        const mdResponse = await fetch(mdFileUrl);
        if (mdResponse.ok) {
            mdContent = await mdResponse.text();
        }
    }
    // โหลดไฟล์ PDF ของนิสิตและแปลงเป็น Base64
    const pdfResponse = await fetch(file_url);
    if (!pdfResponse.ok) throw new Error("ไม่สามารถดาวน์โหลดไฟล์ PDF ของนิสิตได้");
    const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
    const pdfBase64 = encode(pdfBytes);

    // ดึงรายชื่อฟอนต์ที่ฝังอยู่ใน PDF ออกมาส่งให้ AI ร่วมวิเคราะห์
    const detectedFonts = extractPdfFonts(pdfBytes);
    const fontMetadataInfo = detectedFonts.length > 0 
        ? `รายชื่อฟอนต์ที่ตรวจพบใน Metadata ของไฟล์ PDF นี้ได้แก่: ${detectedFonts.join(', ')}` 
        : `ไม่สามารถดึง Metadata ฟอนต์ได้ ให้วิเคราะห์จากรูปลักษณ์ตัวอักษรในหน้าเอกสารโดยตรง`;

    // Prompt และส่งให้ Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const prompt = `
    คุณคือผู้เชี่ยวชาญด้านการตรวจสอบรูปแบบและโครงสร้างเอกสารวิชาการ/โครงงานอย่างละเอียดเชิงลึก
    หน้าที่ของคุณคือ ตรวจสอบไฟล์ PDF ที่แนบมาทุกหน้า โดยเปรียบเทียบกับ "ข้อกำหนดหลัก" และ "รายละเอียดมาตรฐาน" ด้านล่างนี้

    --- ข้อกำหนดหลัก (จากระบบ) ---
    ${requirementText}

    --- รายละเอียดมาตรฐานเพิ่มเติม (จากคู่มือ) ---
    ${mdContent}

    --- ข้อมูลทางเทคนิคที่สกัดได้จากไฟล์ PDF ---
    ${fontMetadataInfo}

    --- ประวัติข้อผิดพลาดและคำแนะนำจากเวอร์ชันก่อนหน้า ---
    ${previousIssuesText}

    แนวทางและหลักเกณฑ์การตรวจสอบของ AI:
    1. การตรวจเทียบเวอร์ชันก่อนหน้า (สำคัญมาก!):
       - หากมีประวัติข้อผิดพลาดจากเวอร์ชันก่อนหน้า ให้ตรวจสอบว่าในไฟล์ PDF ใหม่นี้นิสิตได้ทำการแก้ไขจุดเหล่านั้นแล้วหรือยัง
       - หากแก้ไขเรียบร้อยแล้ว ให้ใส่ลงใน "passed_items" โดยขึ้นต้นว่า "(แก้ไขแล้ว) ..."
       - หากยังไม่ได้แก้ไข ให้ใส่ลงใน "failed_items" โดยระบุตำแหน่งและขึ้นต้นว่า "(ค้างจากเวอร์ชันก่อน) ..."
    2. ด้านโครงสร้าง ฟอนต์ ขนาดตัวอักษร และระยะขอบ:
       - ตรวจเช็กหัวข้อบังคับ สัดส่วนขนาดฟอนต์ (หัวข้อเทียบกับเนื้อหา) ระยะขอบกระดาษซ้าย/ขวา/บน/ล่าง และเลขหน้าอย่างละเอียด
       - ทุกข้อใน "failed_items" ต้องระบุพิกัดตำแหน่งนำหน้าเสมอ เช่น "[หน้า 3 ย่อหน้าที่ 2 บรรทัดที่ 4]"
       
    คำสั่งการตรวจสอบเชิงลึก (ต้องตรวจให้ครบทุกมิติ):
    1. ชนิดฟอนต์ (Font Family) และขนาดตัวอักษร (Font Size):
       - ใช้ข้อมูล Metadata ฟอนต์ด้านบน ร่วมกับการมองเห็นในแต่ละหน้า เพื่อตรวจว่าใช้ฟอนต์ตรงตามเกณฑ์หรือไม่ (เช่น TH Sarabun PSK / TH Sarabun New หรือมีฟอนต์อื่นปะปน เช่น Angsana, Cordia, Calibri, Arial)
       - ตรวจสอบสัดส่วนขนาดตัวอักษรของ "หัวข้อหลัก", "หัวข้อย่อย", และ "เนื้อหา" ว่ามีขนาดถูกต้องตามเกณฑ์ (เช่น หัวข้อใหญ่กว่าเนื้อหา หรือมีจุดไหนที่ตัวอักษรเล็ก/ใหญ่ผิดปกติ หรือลืมปรับขนาดฟอนต์)
    2. ระยะขอบกระดาษ (Margins) และระยะบรรทัด (Line Spacing):
       - สังเกตพื้นที่ว่างขอบซ้าย ขอบขวา ขอบบน และขอบล่างของแต่ละหน้าเทียบกับสัดส่วนกระดาษ A4 ตามเกณฑ์ที่กำหนด (เช่น กั้นซ้าย 1.5 นิ้ว ต้องกว้างกว่ากั้นขวา 1 นิ้วอย่างชัดเจน, ขอบขวาต้องจัดชิดขอบแบบ Justify หรือไม่, การย่อหน้าแรกเว้นระยะถูกต้องหรือไม่)
    3. โครงสร้างและองค์ประกอบเอกสาร:
       - ตรวจหัวข้อบังคับ เลขหน้า การจัดวางภาพ/ตาราง และเนื้อหาให้ครบถ้วน
    4. การระบุตำแหน่งที่ผิดพลาดอย่างเฉพาะเจาะจง (สำคัญมาก!):
       - ใน "failed_items" ทุกข้อ **บังคับให้ขึ้นต้นด้วยพิกัดตำแหน่งเสมอ** ในรูปแบบ: "[หน้า X ย่อหน้าที่ Y บรรทัดที่ Z]" หรือ "[หน้า X หัวข้อ...]" (พร้อมยกตัวอย่างคำหรือประโยคสั้นๆ ในบรรทัดนั้นมาอ้างอิง เพื่อให้นิสิตเปิดเอกสารแล้วเจอจุดแก้ได้ทันที)

    ให้สรุปผลเป็น JSON ล้วนๆ ตามโครงสร้างนี้เท่านั้น ห้ามมี Markdown หรือคำอธิบายเพิ่มเติม:
    {
        "ai_confidence": <ตัวเลข 0-100>,
        "severity": "<เลือกคำใดคำหนึ่ง: 'สูง', 'ปานกลาง', 'ต่ำ', 'ไม่มี'>",
        "failed_items": [
            {
                "issue": "[หน้า X ย่อหน้าที่ Y บรรทัดที่ Z] ระบุปัญหาที่พบอย่างละเอียด (เช่น ขนาดฟอนต์ใหญ่กว่าปกติ / ใช้ฟอนต์ผิดชนิด / ระยะขอบขวาไม่ชิดขอบ)",
                "suggestion": "ระบุวิธีแก้ไขที่ชัดเจนตามเกณฑ์ (เช่น ให้ปรับฟอนต์ในย่อหน้านี้เป็น TH Sarabun PSK ขนาด 16 pt และจัดชิดขอบแบบ Justify)"
            }
        ],
        "passed_items": [
            "ระบุหัวข้อหรือเกณฑ์ที่ทำได้ถูกต้องแล้ว (เช่น ชนิดฟอนต์หลักใช้ TH Sarabun ถูกต้อง, ระยะขอบซ้ายเว้นระยะเข้าเล่ม 1.5 นิ้วถูกต้อง, โครงสร้างบทนำและวัตถุประสงค์ครบถ้วน)"
        ],
        "uncheckable_items": [
            "ระบุเฉพาะสิ่งที่ตรวจไม่ได้จริงๆ (ถ้าตรวจได้ครบแล้วให้ส่ง Array ว่าง [] กลับมา)"
        ]
    }`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey}`;

    const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: "application/pdf", data: pdfBase64 } }
                ]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1
            }
        })
    });

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok || geminiData.error) {
        throw new Error(`Gemini API Error: ${geminiData.error?.message || geminiRes.statusText}`);
    }

    let aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error("Gemini ไม่ตอบสนอง หรือตอบกลับผิดรูปแบบ");

    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    aiText = aiText.replace(/[\u0000-\u001F]+/g, "");

    let aiResultJson;
    try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("ไม่พบโครงสร้าง JSON");
        aiResultJson = JSON.parse(jsonMatch[0]);
    } catch (e) {
        throw new Error("แปลงผลลัพธ์ AI เป็น JSON ไม่สำเร็จ: " + e.message);
    }

    // บันทึกลงตาราง ai_inspection และ ai_inspection_result

    const confidenceScore = Number(aiResultJson.ai_confidence) || 85;
    const failedItems = Array.isArray(aiResultJson.failed_items) ? aiResultJson.failed_items : [];
    const passedItems = Array.isArray(aiResultJson.passed_items) ? aiResultJson.passed_items : [];
    const uncheckableItems = Array.isArray(aiResultJson.uncheckable_items) ? aiResultJson.uncheckable_items : [];

    const totalChecked = passedItems.length + failedItems.length;
    let severityLevel = String(aiResultJson.severity || 'ไม่มี').trim();
    let isPassed = false;

    // เช็กเปอร์เซ็นต์ความผิดพลาด
    if (failedItems.length === 0 && totalChecked > 0) {
        severityLevel = 'ไม่มี';
        isPassed = true;
    } else if (totalChecked > 0) {
        const errorPercentage = (failedItems.length / totalChecked) * 100;
        if (errorPercentage > 50 || severityLevel === 'สูง') {
            severityLevel = 'สูง';
            isPassed = false;
        } else if (errorPercentage > 25 || severityLevel === 'ปานกลาง') {
            severityLevel = 'ปานกลาง';
            isPassed = false;
        } else {
            severityLevel = 'ต่ำ';
            isPassed = false;
        }
    } else {
        severityLevel = failedItems.length > 0 ? 'ปานกลาง' : 'ไม่มี';
        isPassed = failedItems.length === 0;
    }

    // บันทึกสรุปภาพรวมลงตารางai_inspection
    const { data: inspectionData, error: inspectionError } = await supabase
        .from('ai_inspection')
        .insert({
            submission_id: submission_id,
            processing_status: 'Completed',
            ai_confidence: confidenceScore,
            severity: severityLevel,
            is_passed: isPassed
        })
        .select()
        .single();

    if (inspectionError) throw new Error("สร้างประวัติ ai_inspection ไม่สำเร็จ: " + inspectionError.message);

    const realInspectionId = inspectionData.ai_inspection_id || inspectionData.id;

    for (const item of failedItems) {
        if (!item.issue) continue;
        await supabase.from('ai_inspection_result').insert({
            ai_inspection_id: realInspectionId,
            pass_fail_result: false,
            detected_issues: item.issue,
            correction_suggestions: item.suggestion || ""
        });
    }

    for (const item of passedItems) {
        if (!item) continue;
        await supabase.from('ai_inspection_result').insert({
            ai_inspection_id: realInspectionId,
            pass_fail_result: true,
            passed_items: item
        });
    }

    for (const item of uncheckableItems) {
        if (!item) continue;
        await supabase.from('ai_inspection_result').insert({
            ai_inspection_id: realInspectionId,
            uncheckable_items: item
        });
    }

    // ส่งผลลัพธ์กลับไปแจ้งเตือนหน้าเว็บว่าทำงานเสร็จสมบูรณ์
    return new Response(JSON.stringify({
        success: true,
        message: "AI ตรวจสอบและบันทึกข้อมูลเสร็จสิ้น",
        ai_data: aiResultJson
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
    });

  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
    });
  }
})