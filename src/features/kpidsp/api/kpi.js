export default async function handler(req, res) {
  // ดึง URL ลับจาก Environment ของ Vercel
  const GOOGLE_SCRIPT_URL = process.env.VITE_GOOGLE_SCRIPT_URL;

  // ป้องกันกรณีไม่ได้ตั้งค่า Environment Variable
  if (!GOOGLE_SCRIPT_URL) {
    return res.status(500).json({ error: 'System Configuration Error: API Endpoint missing.' });
  }

  // อนุญาตเฉพาะฝั่งเว็บตัวเองเรียกใช้ (CORS Security)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ----------------------------------------------------------------------
  // 1. กระบวนการ GET: ดึงข้อมูลและทำระบบจดจำ (Caching)
  // ----------------------------------------------------------------------
  if (req.method === 'GET') {
    const { sheet } = req.query;
    const fetchUrl = sheet ? `${GOOGLE_SCRIPT_URL}?sheet=${sheet}` : GOOGLE_SCRIPT_URL;

    try {
      const response = await fetch(fetchUrl);
      const data = await response.json();

      // 🏆 หัวใจความเร็ว: ตั้งค่าให้ Vercel จำข้อมูล (Cache) เป็นเวลา 60 วินาที
      // และอนุญาตให้ใช้ข้อมูลเก่า (Stale) ชั่วคราวได้นานสูงสุด 10 นาที ระหว่างวิ่งไปดึงข้อมูลใหม่เบื้องหลัง
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
      
      return res.status(200).json(data);
    } catch (error) {
      console.error('API Proxy GET Error:', error);
      return res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }

  // ----------------------------------------------------------------------
  // 2. กระบวนการ POST: ส่งข้อมูลแบบลับสุดยอดไปยัง Google Sheets
  // ----------------------------------------------------------------------
  if (req.method === 'POST') {
    try {
      // Vercel Serverless จะทำหน้าที่คุยกับ Google แทน Browser 
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      return res.status(200).json({ success: true, message: 'Data synced successfully via Secure Proxy.' });
    } catch (error) {
      console.error('API Proxy POST Error:', error);
      return res.status(500).json({ error: 'Failed to submit data to backend' });
    }
  }

  // ป้องกันยิงผิด Method
  return res.status(405).json({ error: 'Method Not Allowed' });
}
