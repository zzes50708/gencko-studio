<script>
export default {
    name: 'GenesView',
    props: {
        curTab: { type: String, required: true },
        db: { type: Object, default: () => ({}) },
        geneSpecies: { type: String, default: '豹紋守宮' },
        viewingGene: { type: Object, default: null }
    },
    emits: ['update:geneSpecies', 'open-gene', 'navigate'],
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
    <div>
        <!-- Genes List Mode -->
        <transition name="fade">
            <div v-show="curTab==='genes'">
                <h1 class="page-title">守宮基因圖鑑</h1>
                <div class="tabs">
                    <div class="tab" :class="{active: geneSpecies==='豹紋守宮'}" @click="$emit('update:geneSpecies', '豹紋守宮')">豹紋守宮</div>
                    <div class="tab" :class="{active: geneSpecies==='肥尾守宮'}" @click="$emit('update:geneSpecies', '肥尾守宮')">肥尾守宮</div>
                </div>
                <div v-for="(list, cat) in db[geneSpecies]" :key="cat" class="gene-section">
                    <h2 class="gene-cat-title">{{cat}}</h2>
                    <div class="gene-btn-grid">
                        <div v-for="g in list" :key="g" class="gene-btn-item" @click="$emit('open-gene', g)">{{g}} <span>➜</span></div>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Gene Detail Mode -->
        <transition name="fade">
            <div v-show="curTab==='gene_detail'">
                <div v-if="viewingGene" class="prod-container">
                    <button class="btn-back" @click="$emit('navigate', '/genes')">← 返回圖鑑列表</button>
                    <div class="page-text-box">
                        <h1 class="page-title">{{viewingGene.Name}}</h1>
                        <div v-if="viewingGene.Warning" class="warn-box">{{viewingGene.Warning}}</div>
                        <div class="about-layout">
                            <img v-if="viewingGene.ImageURL" :src="convertLink(viewingGene.ImageURL)" class="about-img">
                            <div class="about-content">
                                <h3>基因簡介</h3>
                                <p>{{viewingGene.Brief}}</p>
                                <div v-if="viewingGene.Detail">
                                    <h3 style="margin-top:20px;color:var(--pri)">詳細敘述</h3>
                                    <p style="white-space:pre-wrap">{{viewingGene.Detail}}</p>
                                </div>
                                <div v-if="viewingGene.Source" style="margin-top:20px;font-size:0.9rem;color:#888;border-top:1px solid var(--bd);padding-top:10px;text-align:left;">
                                    資料來源：{{viewingGene.Source}}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>