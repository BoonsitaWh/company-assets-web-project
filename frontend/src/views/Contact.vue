
<template>
  <div class="contact-page">
    <!-- ส่วนหัว -->
    <section class="hero">
      <div class="hero-icon">🏢</div>
      <p class="eyebrow">COMPANY ASSET BORROWING SYSTEM</p>
      <h1>ติดต่อเรา</h1>
      <p>
        ระบบจัดการยืม–คืนทรัพย์สินของบริษัท
        เพื่อให้การจัดการอุปกรณ์สะดวกและตรวจสอบได้
      </p>
    </section>

    <!-- ข้อมูลระบบ -->
    <section class="cards">
      <article class="info-card">
        <div class="icon">📋</div>
        <h2>ข้อมูลระบบ</h2>
        <p>
          ระบบช่วยให้พนักงานตรวจสอบทรัพย์สิน
          ส่งคำขอยืม ติดตามสถานะ และตรวจสอบรายการยืม–คืน
        </p>

        <ul>
          <li>ดูรายการและข้อมูลทรัพย์สิน</li>
          <li>ส่งคำขอยืมทรัพย์สิน</li>
          <li>ติดตามสถานะการยืม–คืน</li>
          <li>จัดการและตรวจสอบรายการตามสิทธิ์ผู้ใช้</li>
        </ul>
      </article>
    </section>

    <!-- ส่วนผู้จัดทำระบบ -->
    <section class="team-section">
      <div class="team-heading">
        <p class="team-eyebrow">OUR TEAM</p>
        <h2>ผู้จัดทำระบบ</h2>
        <p class="team-description">
          ทีมพัฒนาระบบยืม–คืนทรัพย์สินของบริษัท
        </p>
      </div>

      <div class="team-grid">
        <!-- ผู้จัดทำคนที่ 1 -->
        <article class="team-card">
          <div class="team-avatar">👩🏻‍💻</div>

          <div class="member-number">สมาชิกคนที่ 1</div>

          <h3>นางสาว ตติยา ถุนนอก</h3>

          <p class="student-id">
            รหัสนักศึกษา: 116710906067-9
          </p>

          <span class="team-role">ผู้จัดทำระบบ</span>
        </article>

        <!-- ผู้จัดทำคนที่ 2 -->
        <article class="team-card">
          <div class="team-avatar">👩🏻‍💻</div>

          <div class="member-number">สมาชิกคนที่ 2</div>

          <h3>บุญสิตา วงค์เหิม</h3>

          <p class="student-id">
            รหัสนักศึกษา: 116710906014-1
          </p>

          <span class="team-role">ผู้จัดทำระบบ</span>
        </article>
      </div>
    </section>

    <!-- ส่วนท้าย -->
    <footer class="page-footer">
      <div class="footer-icon">🏢</div>

      <strong>Company Asset Borrowing System</strong>

      <p>ระบบจัดการยืม–คืนทรัพย์สินของบริษัท</p>

      <div class="footer-divider"></div>

      <p class="footer-team">
        พัฒนาโดย ตติยา ถุนนอก และ บุญสิตา วงค์เหิม
      </p>

      <p class="copyright">
        © Company Asset Borrowing System
      </p>
    </footer>
  </div>
</template>

<style scoped>
.contact-page {
  min-height: 100vh;
  padding: 32px;
  background: #f4f7fc;
  color: #1e293b;
}

/* ส่วนหัว */
.hero {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px;
  border-radius: 22px;
  text-align: center;
  color: white;
  background: linear-gradient(135deg, #172554, #2563eb);
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.15);
}

.hero-icon {
  font-size: 44px;
  margin-bottom: 12px;
}

.eyebrow {
  font-size: 12px;
  letter-spacing: 2px;
  color: #bfdbfe;
  overflow-wrap: anywhere;
}

.hero h1 {
  margin: 16px 0;
  font-size: clamp(28px, 4vw, 40px);
}

.hero > p:last-child {
  max-width: 650px;
  margin: 0 auto;
  line-height: 1.9;
  color: #dbeafe;
}

/* การ์ดข้อมูลระบบ */
.cards {
  max-width: 700px;
  margin: 30px auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}

.info-card {
  padding: 28px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 5px 20px rgba(15, 23, 42, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.info-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
}

.icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: #dbeafe;
  font-size: 27px;
}

.info-card h2 {
  margin: 18px 0 12px;
  font-size: 22px;
}

.info-card > p,
.info-card li {
  color: #64748b;
  line-height: 1.9;
  font-size: 14px;
}

.info-card ul {
  padding-left: 22px;
}

/* ส่วนผู้จัดทำระบบ */
.team-section {
  max-width: 1100px;
  margin: 48px auto;
}

.team-heading {
  margin-bottom: 28px;
  text-align: center;
}

.team-eyebrow {
  margin: 0 0 8px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 3px;
}

.team-heading h2 {
  margin: 0 0 10px;
  color: #172554;
  font-size: 28px;
}

.team-description {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.8;
}

/* การ์ดสมาชิก */
.team-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.team-card {
  position: relative;
  padding: 32px 22px;
  border: 1px solid #dbeafe;
  border-radius: 20px;
  background: white;
  text-align: center;
  box-shadow: 0 5px 20px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

.team-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.13);
}

/* ไอคอนสมาชิก */
.team-avatar {
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  margin: 0 auto 16px;
  border: 4px solid #eff6ff;
  border-radius: 50%;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  font-size: 38px;
}

/* ลำดับสมาชิก */
.member-number {
  display: inline-block;
  margin-bottom: 14px;
  padding: 5px 12px;
  border-radius: 20px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
}

/* ชื่อสมาชิก */
.team-card h3 {
  margin: 0 0 12px;
  color: #1e293b;
  font-size: 19px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

/* รหัสนักศึกษา */
.student-id {
  margin: 0 0 16px;
  color: #475569;
  font-size: 14px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

/* ป้ายผู้จัดทำ */
.team-role {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 600;
}

/* ส่วนท้าย */
.page-footer {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 20px 10px;
  border-top: 1px solid #dbe3ef;
  text-align: center;
  color: #64748b;
  font-size: 13px;
  line-height: 1.8;
}

.footer-icon {
  margin-bottom: 10px;
  font-size: 30px;
}

.page-footer strong {
  color: #172554;
  font-size: 16px;
}

.page-footer p {
  margin: 6px 0;
}

.footer-divider {
  width: 60px;
  height: 3px;
  margin: 18px auto;
  border-radius: 5px;
  background: #2563eb;
}

.footer-team {
  color: #475569;
}

.copyright {
  margin-top: 16px !important;
  color: #94a3b8;
  font-size: 12px;
}

/* รองรับโทรศัพท์ */
@media (max-width: 700px) {
  .contact-page {
    padding: 16px;
  }

  .hero {
    padding: 36px 20px;
  }

  .cards {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .info-card {
    padding: 22px;
  }

  .team-section {
    margin: 36px auto;
  }

  .team-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    max-width: 420px;
  }

  .team-card {
    padding: 28px 18px;
  }

  .team-card h3 {
    font-size: 18px;
  }

  .student-id {
    font-size: 13px;
  }
}
</style>
