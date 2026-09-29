import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

// ตั้งค่า CORS ให้หน้าเว็บเรียกใช้งานได้
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
            file_link,
            format_id,
            document_format ( document_name, file_url )
        `)
        .eq('submission_id', submission_id)
        .single();

    if (subError) throw new Error("ดึงข้อมูลเอกสารไม่สำเร็จ: " + subError.message);

    const formatId = subData?.format_id;
    const formatName = subData?.document_format?.document_name || "มาตรฐานเอกสารโครงงานทั่วไป";
    
    // ดึง URL ของไฟล์ .md
    const mdFileUrl = Array.isArray(subData?.document_format) 
        ? subData?.document_format[0]?.file_url 
        : subData?.document_format?.file_url;

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
            mdContent = await mdResponse.text(); // ดึงข้อความจากไฟล์ Markdown โดยตรง
        }
    }

    // โหลดไฟล์ PDF ของนิสิตและแปลงเป็น Base64
    const pdfResponse = await fetch(file_url);
    if (!pdfResponse.ok) throw new Error("ไม่สามารถดาวน์โหลดไฟล์ PDF ของนิสิตได้");
    const pdfBase64 = encode(new Uint8Array(await pdfResponse.arrayBuffer()));

    // Prompt และส่งให้ Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const prompt = `
    คุณคือผู้เชี่ยวชาญด้านการตรวจสอบเอกสารโครงงาน
    หน้าที่ของคุณคือ ตรวจสอบไฟล์ PDF ที่แนบมา โดยเปรียบเทียบกับ "ข้อกำหนด" และ "รายละเอียดมาตรฐาน" ด้านล่างนี้

    --- ข้อกำหนดหลัก (จากระบบ) ---
    ${requirementText}

    --- รายละเอียดมาตรฐานเพิ่มเติม (จากไฟล์คู่มือ .md) ---
    ${mdContent}

    แนวทางและหลักเกณฑ์การตรวจสอบของ AI (โปรดใช้เกณฑ์นี้ในการวิเคราะห์):
    1. ด้านโครงสร้างและหัวข้อ (Structure): ให้ตรวจเช็กว่ามีคำสำคัญ/หัวข้อบังคับ เช่น "บทนำ", "วัตถุประสงค์", "กิตติกรรมประกาศ", "บรรณานุกรม" ปรากฏอยู่ในเอกสารครบถ้วนตามข้อกำหนดหรือไม่
    2. ด้านรูปแบบตัวอักษรและการจัดวาง (Formatting):
       - AI ไม่สามารถวัดขนาด pt ของฟอนต์ได้ ให้ใช้วิธีดูความสมดุลเชิงสายตา (Visual Hierarchy) แทน เช่น หัวข้อต้องใหญ่กว่าเนื้อหา, ลำดับหัวข้อย่อยมีการร่นระยะ (Indent)
       - ตรวจสอบว่ามีการใส่เลขหน้าครบถ้วน และรูปแบบจัดวางมีความเป็นระเบียบหรือไม่
    3. ด้านเนื้อหา (Content Logic): ตรวจสอบว่าเนื้อหาใต้หัวข้อต่างๆ มีความสอดคล้องกับชื่อหัวข้อ ไม่ปล่อยว่างไว้
    4. สิ่งที่ไม่สามารถตรวจได้ (Uncheckable): หากเป็นข้อกำหนดที่ต้องใช้โปรแกรมเฉพาะตรวจ เช่น ค่า Metadata ของไฟล์, สี RGB ที่ถูกต้องเป๊ะๆ หรือชนิดฟอนต์ในเชิงไฟล์ระบบ ให้จัดอยู่ใน "uncheckable_items"

    ให้สรุปผลเป็น JSON ล้วนๆ ตามโครงสร้างนี้เท่านั้น ห้ามมี Markdown หรือคำอธิบายเพิ่มเติม:
    {
        "ai_confidence": <ใส่ตัวเลข 0-100 ประเมินความมั่นใจของ AI ในการตรวจ>,
        "severity": "<ประเมินความรุนแรงของข้อผิดพลาดรวม เช่น 'สูง', 'ปานกลาง', 'ต่ำ', 'ไม่มี'>",
        "failed_items": [
            { "issue": "ระบุจุดที่ไม่ตรงกับมาตรฐาน", "suggestion": "คำแนะนำการแก้ไขโดยอิงจากข้อกำหนดด้านบน" }
        ],
        "passed_items": [ "ระบุสิ่งที่ทำได้ถูกต้องตามข้อกำหนดด้านบน" ],
        "uncheckable_items": [ "ระบุสิ่งที่ตรวจไม่ได้ หรือไม่มีบอกไว้ในข้อกำหนดด้านบนอย่างชัดเจน" ]
    }`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey}`;

    const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    // แนบเฉพาะ PDF ของนิสิตไปให้ AI วิเคราะห์
                    { inline_data: { mime_type: "application/pdf", data: pdfBase64 } }
                ]
            }]
        })
    });

    const geminiData = await geminiRes.json();
    let aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) throw new Error("Gemini ไม่ตอบสนอง หรือตอบกลับผิดรูปแบบ");

    // 🌟 ส่วนที่ 4: ทำความสะอาดและแปลง JSON
    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    aiText = aiText.replace(/[\u0000-\u001F]+/g, ""); // ลบอักขระซ่อนรูปที่ทำให้ JSON พัง

    let aiResultJson;
    try {
        aiResultJson = JSON.parse(aiText);
    } catch (e) {
        throw new Error("แปลงผลลัพธ์ AI เป็น JSON ไม่สำเร็จ: " + e.message);
    }

    // บันทึกลงตาราง ai_inspection และ ai_inspection_result

    const confidenceScore = Number(aiResultJson.ai_confidence) || null; 
    const severityLevel = String(aiResultJson.severity || 'ไม่มี');

    const failedItems = aiResultJson.failed_items || [];
    const passedItems = aiResultJson.passed_items || [];
    const uncheckableItems = aiResultJson.uncheckable_items || [];

    // คำนวณจำนวนข้อทั้งหมดที่ AI ตรวจเช็กได้ (ถูก + ผิด)
    const totalChecked = passedItems.length + failedItems.length;
    let isPassed = false;

    // เช็กเปอร์เซ็นต์ความผิดพลาด
    if (totalChecked > 0) {
        const errorPercentage = (failedItems.length / totalChecked) * 100;
        
        // ถ้าเปอร์เซ็นต์ที่ผิดพลาด มากกว่า 50% ให้ผลไม่ผ่าน
        if (errorPercentage > 50) {
            isPassed = false;
        } else {
            isPassed = true;
        }
    } else {
        // กรณีที่ไม่มีข้อมูลถูกและผิดเลย (เช่น มีแต่ตรวจไม่ได้ หรือ AI ตอบผิดรูปแบบ) 
        // ให้เช็กแค่ว่ามี failed_items โผล่มาไหม ถ้ามีคือไม่ผ่าน
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

    // บันทึกรายการที่ไม่ผ่าน
    for (const item of failedItems) {
        if (!item.issue) continue;
        await supabase.from('ai_inspection_result').insert({
            ai_inspection_id: realInspectionId,
            pass_fail_result: false,
            detected_issues: item.issue,
            correction_suggestions: item.suggestion || ""
        });
    }

    // บันทึกรายการที่ผ่าน
    for (const item of passedItems) {
        if (!item) continue;
        await supabase.from('ai_inspection_result').insert({
            ai_inspection_id: realInspectionId,
            pass_fail_result: true,
            passed_items: item
        });
    }

    // บันทึกรายการที่ตรวจไม่ได้
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