<script setup>
import { ref, computed } from "vue";

// today reference
const today = new Date();

// reactive state for the visible month
const currentYear = ref(today.getFullYear());
const currentMonth = ref(today.getMonth()); // 0-11

// helpers
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const weekDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekday(year, month) {
  return new Date(year, month, 1).getDay(); // 0=Sun ... 6=Sat
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value -= 1;
  } else {
    currentMonth.value -= 1;
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value += 1;
  } else {
    currentMonth.value += 1;
  }
}

// build a simple matrix of 6 weeks x 7 days for display
const calendarCells = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;
  const start = firstWeekday(year, month);
  const total = daysInMonth(year, month);

  const cells = [];
  // add blanks before day 1
  for (let i = 0; i < start; i++) cells.push(null);
  // add days
  for (let d = 1; d <= total; d++) cells.push(d);
  // pad to full weeks (up to 42 cells)
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);
  return cells;
});

function isToday(day) {
  return (
    day != null &&
    currentYear.value === today.getFullYear() &&
    currentMonth.value === today.getMonth() &&
    day === today.getDate()
  );
}
</script>

<template>
  <div>
    <div>
      <button type="button" @click="prevMonth">Prev</button>
      <strong>{{ monthNames[currentMonth] }} {{ currentYear }}</strong>
      <button type="button" @click="nextMonth">Next</button>
    </div>

    <table>
      <thead>
        <tr>
          <th v-for="w in weekDayNames" :key="w">{{ w }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in 6" :key="row">
          <td v-for="col in 7" :key="col">
            <span
              v-if="calendarCells[(row - 1) * 7 + (col - 1)] !== null"
              :style="
                isToday(calendarCells[(row - 1) * 7 + (col - 1)])
                  ? 'font-weight:bold; text-decoration: underline;'
                  : ''
              "
            >
              {{ calendarCells[(row - 1) * 7 + (col - 1)] }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Keep it very basic, no fancy styling */
table {
  border-collapse: collapse;
}
th,
td {
  border: 1px solid #ccc;
  padding: 4px;
  text-align: center;
  width: 32px;
  height: 28px;
}
button {
  margin: 4px;
}
</style>
