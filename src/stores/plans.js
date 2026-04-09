import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, generateId } from '../db/dexie.js'
import { getCurrentWeekVariant } from '../utils/dateHelpers.js'

export const usePlansStore = defineStore('plans', () => {
  const plans = ref([])
  const trainingDays = ref([])
  const activePlan = computed(() => plans.value.find(p => p.isActive))

  async function loadPlans() {
    plans.value = await db.plans.toArray()
    trainingDays.value = await db.trainingDays.toArray()
  }

  async function createPlan(name, type) {
    const plan = {
      id: generateId(),
      name,
      type,
      isActive: plans.value.length === 0,
      deloadEnabled: false,
      deloadIntervalWeeks: 4,
      deloadStartDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await db.plans.add(plan)
    plans.value.push(plan)
    return plan
  }

  async function updatePlan(planId, updates) {
    await db.plans.update(planId, { ...updates, updatedAt: new Date().toISOString() })
    const idx = plans.value.findIndex(p => p.id === planId)
    if (idx !== -1) Object.assign(plans.value[idx], updates)
  }

  async function deletePlan(planId) {
    await db.plans.delete(planId)
    const days = await db.trainingDays.where('planId').equals(planId).toArray()
    await db.trainingDays.bulkDelete(days.map(d => d.id))
    plans.value = plans.value.filter(p => p.id !== planId)
    trainingDays.value = trainingDays.value.filter(d => d.planId !== planId)
  }

  async function setActivePlan(planId) {
    for (const plan of plans.value) {
      if (plan.isActive) {
        await db.plans.update(plan.id, { isActive: false })
        plan.isActive = false
      }
    }
    await db.plans.update(planId, { isActive: true })
    const plan = plans.value.find(p => p.id === planId)
    if (plan) plan.isActive = true
  }

  async function addTrainingDay(planId, title, weekVariant = null) {
    const existingDays = trainingDays.value.filter(
      d => d.planId === planId && d.weekVariant === weekVariant
    )
    const day = {
      id: generateId(),
      planId,
      title,
      weekVariant,
      dayOrder: existingDays.length,
      exercises: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await db.trainingDays.add(day)
    trainingDays.value.push(day)
    return day
  }

  async function updateTrainingDay(dayId, updates) {
    await db.trainingDays.update(dayId, { ...updates, updatedAt: new Date().toISOString() })
    const idx = trainingDays.value.findIndex(d => d.id === dayId)
    if (idx !== -1) Object.assign(trainingDays.value[idx], updates)
  }

  async function deleteTrainingDay(dayId) {
    await db.trainingDays.delete(dayId)
    trainingDays.value = trainingDays.value.filter(d => d.id !== dayId)
  }

  function getDaysForPlan(planId, weekVariant = null) {
    return trainingDays.value
      .filter(d => d.planId === planId && (weekVariant === null || d.weekVariant === weekVariant))
      .sort((a, b) => a.dayOrder - b.dayOrder)
  }

  function getTodaysTrainingDays() {
    if (!activePlan.value) return []
    const variant = activePlan.value.type === 'alternating' ? getCurrentWeekVariant() : null
    return getDaysForPlan(activePlan.value.id, variant)
  }

  return {
    plans,
    trainingDays,
    activePlan,
    loadPlans,
    createPlan,
    updatePlan,
    deletePlan,
    setActivePlan,
    addTrainingDay,
    updateTrainingDay,
    deleteTrainingDay,
    getDaysForPlan,
    getTodaysTrainingDays
  }
})
