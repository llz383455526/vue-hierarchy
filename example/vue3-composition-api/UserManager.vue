<!-- Vue 3 Composition API (<script setup> + TypeScript) 示例 - 用户管理组件 -->
<!-- 用于验证 Vue Hierarchy 插件对 Composition API / script setup 的解析效果 -->

<template>
  <div class="user-manager">
    <h1>{{ title }}</h1>

    <div v-if="isLoading" class="loading">
      <span>加载中...</span>
    </div>

    <div v-else>
      <SearchBar
        :placeholder="searchPlaceholder"
        @search="handleSearch"
      />

      <ul class="user-list">
        <li v-for="user in filteredUsers" :key="user.id">
          <UserCard
            :user="user"
            :editable="isAdmin"
            @update="handleUserUpdate"
            @delete="handleUserDelete"
          />
        </li>
      </ul>

      <Pagination
        :total="totalCount"
        :page="currentPage"
        @change="handlePageChange"
      />
    </div>

    <Modal v-show="showModal" @close="closeModal">
      <template #header>
        <h2>{{ modalTitle }}</h2>
      </template>
      <template #default>
        <UserForm :user="editingUser" @submit="saveUser" />
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, watchEffect, onMounted, onUnmounted, onBeforeMount, provide, inject, shallowRef, readonly } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useDebounce } from '@/composables/useDebounce'
import { usePagination } from '@/composables/usePagination'
import type { User, ApiResponse } from '@/types'

// ============================================================
//  Props & Emits
// ============================================================

interface Props {
  title?: string
  apiEndpoint: string
  pageSize?: number
  isAdmin: boolean
  roles?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  title: '用户管理',
  pageSize: 20,
  roles: () => [],
})

const emit = defineEmits<{
  (e: 'user-updated', user: User): void
  (e: 'user-deleted', userId: number): void
  (e: 'error', error: Error): void
}>()

// ============================================================
//  Composables
// ============================================================

const router = useRouter()
const { user: currentUser, isAuthenticated, logout } = useAuth()
const { debouncedValue: debouncedSearch, value: searchInput } = useDebounce<string>('', 300)
const { currentPage, totalPages, goToPage } = usePagination()

// ============================================================
//  Reactive State
// ============================================================

const users = ref<User[]>([])
const searchQuery = ref('')
const totalCount = ref(0)
const isLoading = ref(false)
const showModal = ref(false)
const editingUser = ref<User | null>(null)
const errorMessage = ref('')
const lastFetchTime = ref<number | null>(null)

const sortConfig = reactive({
  field: 'name' as keyof User,
  order: 'asc' as 'asc' | 'desc',
})

const formState = reactive<{
  name: string
  email: string
  role: string
}>({
  name: '',
  email: '',
  role: 'user',
})

const cachedResponse = shallowRef<ApiResponse | null>(null)
const readonlyUsers = readonly(users)

// ============================================================
//  Computed
// ============================================================

const filteredUsers = computed(() => {
  if (!searchQuery.value) {
    return users.value
  }
  const query = searchQuery.value.toLowerCase()
  return users.value.filter(
    (user) =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
  )
})

const searchPlaceholder = computed(() => {
  return `搜索 ${totalCount.value} 个用户...`
})

const modalTitle = computed<string>(() => {
  return editingUser.value ? '编辑用户' : '新建用户'
})

const hasUsers = computed(() => users.value.length > 0)

const sortedUsers = computed(() => {
  return [...filteredUsers.value].sort((a, b) => {
    const modifier = sortConfig.order === 'asc' ? 1 : -1
    const aVal = a[sortConfig.field]
    const bVal = b[sortConfig.field]
    return aVal > bVal ? modifier : -modifier
  })
})

// ============================================================
//  Watchers
// ============================================================

watch(searchQuery, (newVal, oldVal) => {
  currentPage.value = 1
  console.log('search changed:', oldVal, '->', newVal)
})

watch(currentPage, (page) => {
  fetchUsers(page)
}, { immediate: true })

watch(
  () => editingUser.value?.name,
  (newName) => {
    console.log('Editing user name changed:', newName)
  }
)

watch([searchQuery, currentPage], ([query, page]) => {
  console.log('Multi-source watch:', query, page)
})

watchEffect(() => {
  if (errorMessage.value) {
    console.error('Error:', errorMessage.value)
  }
})

const stopWatcher = watch(isLoading, (loading) => {
  document.title = loading ? '加载中...' : props.title ?? '用户管理'
})

// ============================================================
//  Lifecycle Hooks
// ============================================================

onBeforeMount(() => {
  console.log('UserManager: onBeforeMount')
})

onMounted(() => {
  fetchUsers()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  stopWatcher()
})

// ============================================================
//  Provide / Inject
// ============================================================

provide('refreshUsers', fetchUsers)
provide('userCount', totalCount)
provide('theme', 'light')

const appConfig = inject<Record<string, any>>('appConfig')
const eventBus = inject('eventBus')

// ============================================================
//  Methods / Functions
// ============================================================

async function fetchUsers(page = currentPage.value) {
  isLoading.value = true
  try {
    const response = await fetch(
      `${props.apiEndpoint}/users?page=${page}&size=${props.pageSize}`
    )
    const data: ApiResponse = await response.json()
    users.value = data.items
    totalCount.value = data.total
    lastFetchTime.value = Date.now()
    cachedResponse.value = data
  } catch (error) {
    errorMessage.value = (error as Error).message
    emit('error', error as Error)
  } finally {
    isLoading.value = false
  }
}

function handleSearch(query: string) {
  searchQuery.value = query
}

function handleUserUpdate(user: User) {
  const index = users.value.findIndex((u) => u.id === user.id)
  if (index !== -1) {
    users.value[index] = user
    emit('user-updated', user)
  }
}

function handleUserDelete(userId: number) {
  users.value = users.value.filter((u) => u.id !== userId)
  emit('user-deleted', userId)
}

function handlePageChange(page: number) {
  currentPage.value = page
}

function closeModal() {
  showModal.value = false
  editingUser.value = null
}

function handleResize() {
  // 响应窗口大小变化
}

async function saveUser(userData: User) {
  try {
    const method = userData.id ? 'PUT' : 'POST'
    const url = userData.id
      ? `${props.apiEndpoint}/users/${userData.id}`
      : `${props.apiEndpoint}/users`

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })

    closeModal()
    fetchUsers()
  } catch (error) {
    errorMessage.value = (error as Error).message
  }
}

// ============================================================
//  Expose
// ============================================================

defineExpose({
  fetchUsers,
  closeModal,
  totalCount,
})
</script>

<style scoped>
.user-manager {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.user-list {
  list-style: none;
  padding: 0;
}

.user-list li {
  margin-bottom: 12px;
}
</style>

<style>
/* 全局样式 */
.user-manager h1 {
  color: #333;
}
</style>
