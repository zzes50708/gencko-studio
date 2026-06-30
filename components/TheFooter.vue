<template>
  <footer>
    <div style="margin-bottom: 5px; font-weight: bold; color: var(--pri)">
      Gencko Studio｜專業豹紋守宮選育工作室
    </div>
    <div>© 2026 Gencko Studio. 版權所有</div>
  </footer>
</template>
<style scoped>
/*
  [局部樣式與全域整合]
  已將 Footer 專屬樣式從全域 style.css 抽回，並導入 CSS 變數。
*/
footer {
  width: 100%;
  margin-top: 40px;
  padding-top: 20px;
  padding-bottom: 30px;
  text-align: center;
  /* 頁尾自帶主題背景，確保文字對比在深色場景頁（首頁）與淺色頁皆達 WCAG AA。
       原本 transparent + opacity:0.6 在首頁深底會讓深色文字幾乎隱形。 */
  background: var(--card-bg-solid);
  color: var(--txt-muted);
  font-size: 0.9rem;
  border-top: 1px dashed var(--bd);
  transition: color 0.3s;
}

footer:hover {
  color: var(--txt);
}

/* 手機版為了避開底層導航列，可能需要額外的 padding-bottom 空間 */
@media (max-width: 768px) {
  footer {
    padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px));
    font-size: 0.8rem;
  }
}
</style>
