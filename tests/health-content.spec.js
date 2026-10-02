import { describe, expect, it } from 'vitest'
import { CHECKUP_QUESTIONS, PURCHASE_QUESTIONS, TRIAGE_QUESTIONS } from '../utils/health'

const questionById = (questions, id) => questions.find((question) => question.id === id)
const optionById = (question, id) => question.options.find((option) => option.id === id)

describe('健康評估題組內容與判讀設定', () => {
  it('保留三種模式的完整題數', () => {
    expect(TRIAGE_QUESTIONS).toHaveLength(8)
    expect(CHECKUP_QUESTIONS).toHaveLength(30)
    expect(PURCHASE_QUESTIONS).toHaveLength(4)
  })

  it('套用快篩年齡、拒食期間與環境風險設定', () => {
    const gender = questionById(TRIAGE_QUESTIONS, 'gender')
    const fastDays = questionById(TRIAGE_QUESTIONS, 'fastDays')
    const environment = questionById(TRIAGE_QUESTIONS, 'env')

    expect(gender.subtitle).toBeUndefined()
    expect(optionById(gender, 'subadult').severity).toBe('warn')
    expect(optionById(gender, 'juvenile').severity).toBe('critical')
    expect(optionById(gender, 'unknown').severity).toBe('critical')
    expect(optionById(fastDays, 'd30').severity).toBe('critical')
    expect(optionById(environment, 'substrate').label).toContain('不適合的底材')
  })

  it('套用完整檢查的鼻孔與混養判讀設定', () => {
    const nose = questionById(CHECKUP_QUESTIONS, 'nose')
    const cohabitation = questionById(CHECKUP_QUESTIONS, 'cohab')

    expect(nose.options.map(({ label, severity }) => ({ label, severity }))).toEqual([
      { label: '乾淨、無分泌物', severity: 'normal' },
      { label: '少量分泌物', severity: 'warn' },
      { label: '透明黏液持續', severity: 'critical' }
    ])
    expect(cohabitation.subtitle).toBeUndefined()
    expect(optionById(cohabitation, 'sizeGap').severity).toBe('critical')
  })
})
