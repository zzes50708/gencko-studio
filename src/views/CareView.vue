<script>
export default {
    name: 'CareView',
    props: {
        careImg: { type: String, default: '' }
    },
    methods: {
        convertLink(url) {
            if (!url) return '';
            const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
            const match = url.match(driveRegex);
            let target = url;
            if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
            return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`;
        }
    }
}
</script>

<template>
    <div class="page-text-box">
        <h1 class="page-title">守宮飼養方式指南</h1>
        <img v-if="careImg" :src="convertLink(careImg)" class="care-top-img">
        <table class="care-table">
            <tr><td class="care-label">飼養箱</td><td class="care-value">至少40×30×20公分起（視個體大小調整），可選玻璃或壓克力材質。若空間允許，提供較大空間效果更佳。</td></tr>
            <tr><td class="care-label">底材</td><td class="care-value">使用易清潔、無碎屑及誤食風險的底材，如廚房紙巾、椰纖土、大顆赤玉土等。避免使用沙粒或細碎底材，以防吞入造成腸胃阻塞。</td></tr>
            <tr><td class="care-label">躲避處</td><td class="care-value">至少準備一處：為避免守宮因環境造成緊迫，提供遮蔽物可以提升守宮的安全感，同時可幫助脫皮。</td></tr>
            <tr><td class="care-label">加熱與溫度</td><td class="care-value">提供底部加熱墊，創造熱區與冷區。建議熱區約 30–32°C，冷區約 24–26°C。守宮可依需求自行選擇合適區域。</td></tr>
            <tr><td class="care-label">濕度</td><td class="care-value">整體環境維持乾燥，但濕區濕度略高，以協助脫皮。濕度控制與乾燥底材與乾燥環境並存是地棲守宮的最佳選擇。</td></tr>
            <tr><td class="care-label">飲水</td><td class="care-value">每日提供乾淨水源，使用淺水碟即可，並每天更換水以確保衛生。</td></tr>
        </table>
        <div class="care-section">
            <div class="care-h">飲食與營養管理</div>
            <div class="care-p">地棲守宮為標準食蟲性動物，均衡的營養與定期補充對健康至關重要。</div>
            <div class="care-p">● 主要餌料：蟋蟀、杜比亞蟑螂為主。依個體需求搭配，避免單一餵食。</div>
            <div class="care-p">● 補充營養：建議定期為餌料裹鈣粉與維生素（含 D₃），防止鈣質缺乏、代謝性骨病與脫皮異常。</div>
            <div class="care-p">● 餵食頻率與份量：幼體建議每日或隔日餵食；成體則每隔 2–3 天餵食一次。餵食份量以不超過守宮頭部寬度為上限。</div>
        </div>
        <div class="care-section">
            <div class="care-h">常見飼養注意事項</div>
            <div class="care-p">● 脫皮期間：在脫皮期間，務必維持濕躲區濕潤，並提供可摩擦的粗糙表面（如木塊或岩石），可協助守宮順利脫皮。若腳趾或尾巴出現卡皮情形，請立即協助移除以免造成阻塞或傷害。</div>
            <div class="care-p">● 單獨飼養：地棲守宮具有領域性，不適合混養。建議一缸一隻，以避免爭鬥、壓力或健康問題。</div>
            <div class="care-p">● 避免過度干擾：過度頻繁把玩、搬動、抓取，或環境劇烈變動，都可能導致守宮緊張，甚至出現自我防衛（如斷尾）行為。</div>
        </div>
        <div class="care-section">
            <div class="care-h">為何選擇豹紋／肥尾守宮</div>
            <div class="care-p">● 容易飼養：對環境要求彈性，適合首次接觸爬蟲的飼主。</div>
            <div class="care-p">● 健康穩定：只要環境、飲食、溫濕度控制得宜，守宮能展現良好食慾、脫皮與活動狀態。</div>
            <div class="care-p">● 相對友善：地棲習性、安靜性格、體型適中，適合室內飼養，照顧相對簡便。</div>
        </div>
        <div class="care-quote">
            我們將守宮視為需被妥善照護的生命，而非一般商品。本指南旨在協助飼主以正確、全面的知識理解守宮的行為與需求，並依據其生理特性提供安全、穩定且適宜的環境。需要特別強調的是，守宮在個體性格、反應模式與適應能力上皆存在差異，環境配置與照護方式亦無絕對標準，應根據個體狀況進行調整。
        </div>
    </div>
</template>