<script setup>
import { computed, ref } from 'vue'
import { GENES_DB } from '~/utils/genes-db'
import { getPriceRangeError } from '~/utils/shop-catalog'
const props = defineProps({
  modelValue: { type: Object, required: true },
  species: { type: String, required: true },
  inventory: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue'])
const geneSearch = ref('')
const categories = computed(() => GENES_DB[props.species] || {})
const available = computed(() =>
  props.inventory.filter(
    (item) =>
      item.Species === props.species &&
      ['ForSale', 'Auction', 'Reserved', ...(props.modelValue.sold ? ['Sold'] : [])].includes(
        item.Status
      )
  )
)
const availableGenes = computed(() => new Set(available.value.flatMap((item) => item.Genes || [])))
const years = computed(() =>
  [
    ...new Set(
      available.value.map((item) => String(item.Birthday || '').match(/\d{4}/)?.[0]).filter(Boolean)
    )
  ]
    .sort()
    .reverse()
)
const priceError = computed(() => getPriceRangeError(props.modelValue))
const update = (key, value) => emit('update:modelValue', { ...props.modelValue, [key]: value })
const toggle = (key, value) =>
  update(
    key,
    props.modelValue[key].includes(value)
      ? props.modelValue[key].filter((item) => item !== value)
      : [...props.modelValue[key], value]
  )
const matchingGenes = (list, unavailable = false) =>
  list
    .filter(
      (gene) =>
        (unavailable
          ? !availableGenes.value.has(gene) && !props.modelValue.genes.includes(gene)
          : availableGenes.value.has(gene) || props.modelValue.genes.includes(gene)) &&
        gene.toLowerCase().includes(geneSearch.value.trim().toLowerCase())
    )
    .sort(
      (a, b) =>
        Number(props.modelValue.genes.includes(b)) - Number(props.modelValue.genes.includes(a))
    )
const categoryHelp = {
  顯性: '一份基因即可表現',
  隱性: '需兩份基因才會表現',
  共顯性: '不同份數可能有不同表現',
  多遺傳: '多個基因共同影響外觀'
}
</script>
<template>
  <div class="shop-filters">
    <fieldset>
      <legend>快速篩選</legend>
      <label>
        <input
          type="checkbox"
          :checked="modelValue.beginner"
          @change="update('beginner', $event.target.checked)"
        />
        新手推薦
      </label>
    </fieldset>
    <fieldset>
      <legend>狀態</legend>
      <div class="choice-row">
        <label>
          <input
            type="checkbox"
            :checked="modelValue.stock"
            @change="update('stock', $event.target.checked)"
          />
          販售中
        </label>
        <label>
          <input
            type="checkbox"
            :checked="modelValue.sold"
            @change="update('sold', $event.target.checked)"
          />
          已售出
        </label>
      </div>
    </fieldset>
    <fieldset class="price-fields">
      <legend>價格範圍</legend>
      <div class="price-row">
        <label>
          最低價格
          <input
            type="number"
            min="0"
            inputmode="numeric"
            :value="modelValue.minP"
            :aria-invalid="!!priceError"
            :aria-describedby="priceError ? 'shop-price-error' : undefined"
            @input="update('minP', $event.target.value)"
          />
        </label>
        <label>
          最高價格
          <input
            type="number"
            min="0"
            inputmode="numeric"
            :value="modelValue.maxP"
            :aria-invalid="!!priceError"
            :aria-describedby="priceError ? 'shop-price-error' : undefined"
            @input="update('maxP', $event.target.value)"
          />
        </label>
      </div>
      <p v-if="priceError" id="shop-price-error" role="alert" class="error">{{ priceError }}</p>
    </fieldset>
    <fieldset>
      <legend>性別</legend>
      <div class="choice-row">
        <label>
          <input
            type="checkbox"
            :checked="modelValue.sexM"
            @change="update('sexM', $event.target.checked)"
          />
          公
        </label>
        <label>
          <input
            type="checkbox"
            :checked="modelValue.sexF"
            @change="update('sexF', $event.target.checked)"
          />
          母
        </label>
      </div>
      <p class="hint">未確認性別的個體仍會顯示。</p>
    </fieldset>
    <fieldset v-if="years.length">
      <legend>出生年份</legend>
      <div class="choice-row">
        <label v-for="year in years" :key="year">
          <input
            type="checkbox"
            :checked="modelValue.years.includes(year)"
            @change="toggle('years', year)"
          />
          {{ year }}
        </label>
      </div>
    </fieldset>
    <fieldset class="genes-field">
      <legend>基因篩選（可多選）</legend>
      <input v-model="geneSearch" type="search" aria-label="搜尋基因" placeholder="輸入基因名稱" />
      <p class="hint">所選基因需同時符合。</p>
      <details
        v-for="(list, category) in categories"
        :key="category"
        class="gene-category"
        :open="geneSearch.trim() ? true : undefined"
      >
        <summary>
          {{ category }}
          <span>{{ modelValue.genes.filter((gene) => list.includes(gene)).length || '' }}</span>
        </summary>
        <p class="hint">{{ categoryHelp[category] }}</p>
        <div class="choice-row gene-choices">
          <label v-for="gene in matchingGenes(list)" :key="gene">
            <input
              type="checkbox"
              :checked="modelValue.genes.includes(gene)"
              @change="toggle('genes', gene)"
            />
            {{ gene }}
          </label>
        </div>
        <p v-if="!matchingGenes(list).length" class="hint">沒有符合的可選基因。</p>
        <details v-if="matchingGenes(list, true).length" class="unavailable-genes">
          <summary>目前無庫存（{{ matchingGenes(list, true).length }}）</summary>
          <p class="hint">這些基因目前沒有對應個體，暫不開放選取。</p>
          <span v-for="gene in matchingGenes(list, true)" :key="gene">{{ gene }}</span>
        </details>
      </details>
    </fieldset>
  </div>
</template>
<style scoped>
.shop-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 20px;
  color: var(--txt);
}
fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
legend {
  font-size: 13px;
  font-weight: 700;
  padding: 0;
  margin-bottom: 6px;
}
.choice-row {
  display: flex;
  gap: 4px 10px;
  flex-wrap: wrap;
}
label {
  display: flex;
  gap: 7px;
  align-items: center;
  min-height: 36px;
  font-size: 14px;
  cursor: pointer;
}
input[type='checkbox'] {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--pri);
  flex: none;
}
.price-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.price-row label {
  display: grid;
  font-size: 12px;
  gap: 4px;
}
.shop-filters input[type='number'],
.shop-filters input[type='search'] {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--bd);
  border-radius: 2px;
  background: var(--card-bg-solid);
  color: var(--txt);
  padding: 6px 9px;
  min-height: 38px;
  font-size: 16px;
}
.hint {
  font-size: 12px;
  color: var(--txt-muted);
  line-height: 1.5;
  margin: 4px 0 8px;
}
.error {
  color: var(--pri);
  font-size: 13px;
  margin: 6px 0;
}
.genes-field {
  grid-column: 1/-1;
}
.gene-category {
  border-bottom: 1px solid var(--bd);
}
summary {
  min-height: 40px;
  padding: 8px 0;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}
summary span {
  margin-left: 8px;
  color: var(--pri);
}
.gene-choices label {
  min-width: calc(50% - 10px);
}
.unavailable-genes {
  font-size: 12px;
  color: var(--txt-muted);
  padding-bottom: 8px;
}
.unavailable-genes summary {
  font-size: 12px;
  font-weight: 400;
}
input:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 2px;
}
@media (min-width: 1100px) {
  .shop-filters {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
  .genes-field {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0 16px;
  }
  .genes-field > legend,
  .genes-field > input,
  .genes-field > .hint {
    grid-column: 1/-1;
  }
  .genes-field > input {
    max-width: 360px;
  }
}
@media (max-width: 767px) {
  .shop-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .price-fields,
  .genes-field {
    grid-column: 1/-1;
  }
  label {
    min-height: 40px;
  }
  .gene-choices label {
    min-width: calc(50% - 10px);
  }
}
@media (pointer: coarse) {
  label,
  summary {
    min-height: 44px;
  }
}
/* 分類收起時兩欄排列，展開後使用整列閱讀基因與說明。 */
@media (max-width: 767px) {
  .shop-filters {
    gap: 8px 12px;
  }
  legend {
    margin-bottom: 4px;
  }
  label,
  summary {
    min-height: 44px;
  }
  .hint {
    margin-block: 2px 4px;
  }
  .genes-field {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 12px;
  }
  .genes-field > legend,
  .genes-field > input,
  .genes-field > .hint,
  .gene-category[open] {
    grid-column: 1 / -1;
  }
  .gene-category {
    min-width: 0;
  }
  .gene-category > summary {
    display: list-item;
    padding-block: 6px;
  }
  .shop-filters > fieldset:nth-of-type(2) .choice-row {
    column-gap: 6px;
  }
  .shop-filters > fieldset:nth-of-type(2) label {
    gap: 5px;
    font-size: 13px;
  }
}
</style>
