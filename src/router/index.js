import { createRouter, createWebHistory } from 'vue-router';

// 引入所有視圖組件
import HomeView from '../views/HomeView.vue';
import AboutView from '../views/AboutView.vue';
import CareView from '../views/CareView.vue';
import FaqView from '../views/FaqView.vue';
import ArticlesView from '../views/ArticlesView.vue';
import GenesView from '../views/GenesView.vue';
import QsView from '../views/QsView.vue';
import HealthView from '../views/HealthView.vue';
import HospitalView from '../views/HospitalView.vue';
import BreedersView from '../views/BreedersView.vue';
import MerchView from '../views/MerchView.vue';
import ShopView from '../views/ShopView.vue';
import CalculatorView from '../views/CalculatorView.vue';

const routes = [
    {
        path: '/',
        name: 'home',
        component: HomeView
    },
    {
        path: '/about',
        name: 'about',
        component: AboutView
    },
    {
        path: '/care',
        name: 'care',
        component: CareView
    },
    {
        path: '/faq',
        name: 'faq',
        component: FaqView
    },
    {
        path: '/calculator',
        name: 'calculator',
        component: CalculatorView
    },
    // 文章列表與內頁共用 ArticlesView
    {
        path: '/articles',
        name: 'articles',
        component: ArticlesView
    },
    {
        path: '/articles/:id',
        name: 'article_detail',
        component: ArticlesView
    },
    // 基因圖鑑列表與內頁共用 GenesView
    {
        path: '/genes',
        name: 'genes',
        component: GenesView
    },
    {
        path: '/genes/:id', 
        name: 'gene_detail',
        component: GenesView
    },
    {
        path: '/qs',
        name: 'qs',
        component: QsView
    },
    {
        path: '/health',
        name: 'health',
        component: HealthView
    },
    {
        path: '/hospital',
        name: 'hospital',
        component: HospitalView
    },
    {
        path: '/breeders',
        name: 'breeders',
        component: BreedersView
    },
    // 周邊商品列表與內頁共用 MerchView
    {
        path: '/merch',
        name: 'merch',
        component: MerchView
    },
    {
        path: '/merch/:id',
        name: 'merch_detail',
        component: MerchView
    },
    // 商城列表與內頁共用 ShopView
    {
        path: '/shop',
        name: 'shop',
        component: ShopView
    },
    {
        path: '/product/:id',
        name: 'product_detail',
        component: ShopView
    },
    // 捕捉所有未定義路由，重導向至首頁
    {
        path: '/:pathMatch(.*)*',
        redirect: '/'
    }
];

const router = createRouter({
    // 使用 import.meta.env.BASE_URL 以支援非根目錄部署，避免重新整理時路徑錯亂導致跳回首頁
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition;
        } else {
            return { top: 0 };
        }
    }
});

export default router;