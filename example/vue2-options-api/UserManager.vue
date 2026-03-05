<!-- Vue 2 Options API 示例 - 用户管理组件 -->
<!-- 用于验证 Vue Hierarchy 插件对 Options API 的解析效果 -->

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
        <UserForm :user="editingUser" @submit="handleUserUpdate" />
      </template>
    </Modal>
  </div>
</template>

<script>
import SearchBar from './SearchBar.vue'
import UserCard from './UserCard.vue'
import UserForm from './UserForm.vue'
import Pagination from './Pagination.vue'
import Modal from './Modal.vue'
import { validateEmail } from '../utils/validators'
import authMixin from '../mixins/authMixin'
import logMixin from '../mixins/logMixin'

export default {
  name: 'UserManager',

  components: {
    SearchBar,
    UserCard,
    UserForm,
    Pagination,
    Modal,
  },

  mixins: [authMixin, logMixin],

  directives: {
    focus: {
      inserted(el) {
        el.focus()
      },
    },
    highlight: {
      bind(el, binding) {
        el.style.backgroundColor = binding.value || '#ff0'
      },
    },
  },

  props: {
    title: {
      type: String,
      default: '用户管理',
    },
    apiEndpoint: {
      type: String,
      required: true,
    },
    pageSize: {
      type: Number,
      default: 20,
    },
    isAdmin: Boolean,
    roles: {
      type: Array,
      default: () => [],
    },
  },

  emits: ['user-updated', 'user-deleted', 'error'],

  data() {
    return {
      users: [],
      searchQuery: '',
      currentPage: 1,
      totalCount: 0,
      isLoading: false,
      showModal: false,
      editingUser: null,
      sortField: 'name',
      sortOrder: 'asc',
      errorMessage: '',
      lastFetchTime: null,
    }
  },

  computed: {
    filteredUsers() {
      if (!this.searchQuery) {
        return this.users
      }
      const query = this.searchQuery.toLowerCase()
      return this.users.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      )
    },
    searchPlaceholder() {
      return `搜索 ${this.totalCount} 个用户...`
    },
    modalTitle() {
      return this.editingUser ? '编辑用户' : '新建用户'
    },
    hasUsers() {
      return this.users.length > 0
    },
    sortedUsers: {
      get() {
        return [...this.filteredUsers].sort((a, b) => {
          const modifier = this.sortOrder === 'asc' ? 1 : -1
          return a[this.sortField] > b[this.sortField] ? modifier : -modifier
        })
      },
      set(value) {
        this.users = value
      },
    },
  },

  watch: {
    searchQuery(newVal, oldVal) {
      this.currentPage = 1
      this.logAction('search', { from: oldVal, to: newVal })
    },
    currentPage: {
      handler(page) {
        this.fetchUsers(page)
      },
      immediate: true,
    },
    'editingUser.name': function (newName) {
      console.log('Editing user name changed:', newName)
    },
  },

  filters: {
    capitalize(value) {
      if (!value) return ''
      return value.charAt(0).toUpperCase() + value.slice(1)
    },
    truncate(value, length = 50) {
      if (value.length <= length) return value
      return value.substring(0, length) + '...'
    },
  },

  provide() {
    return {
      refreshUsers: this.fetchUsers,
      userCount: this.totalCount,
      theme: 'light',
    }
  },

  inject: ['appConfig', 'eventBus'],

  // --- Lifecycle Hooks ---

  beforeCreate() {
    console.log('UserManager: beforeCreate')
  },

  created() {
    this.initializeComponent()
  },

  beforeMount() {
    this.setupEventListeners()
  },

  mounted() {
    this.fetchUsers()
    this.$refs.searchInput?.focus()
  },

  beforeUpdate() {
    this.logAction('beforeUpdate')
  },

  updated() {
    this.logAction('updated')
  },

  activated() {
    this.refreshData()
  },

  deactivated() {
    this.cleanupTimers()
  },

  beforeDestroy() {
    this.removeEventListeners()
  },

  destroyed() {
    console.log('UserManager: destroyed')
  },

  errorCaptured(err, vm, info) {
    this.errorMessage = `Error in ${info}: ${err.message}`
    this.$emit('error', err)
    return false
  },

  // --- Methods ---

  methods: {
    async fetchUsers(page = this.currentPage) {
      this.isLoading = true
      try {
        const response = await fetch(
          `${this.apiEndpoint}/users?page=${page}&size=${this.pageSize}`
        )
        const data = await response.json()
        this.users = data.items
        this.totalCount = data.total
        this.lastFetchTime = Date.now()
      } catch (error) {
        this.errorMessage = error.message
        this.$emit('error', error)
      } finally {
        this.isLoading = false
      }
    },

    handleSearch(query) {
      this.searchQuery = query
    },

    handleUserUpdate(user) {
      const index = this.users.findIndex((u) => u.id === user.id)
      if (index !== -1) {
        this.$set(this.users, index, user)
        this.$emit('user-updated', user)
      }
    },

    handleUserDelete(userId) {
      this.users = this.users.filter((u) => u.id !== userId)
      this.$emit('user-deleted', userId)
    },

    handlePageChange(page) {
      this.currentPage = page
    },

    openModal(user = null) {
      this.editingUser = user
      this.showModal = true
    },

    closeModal() {
      this.showModal = false
      this.editingUser = null
    },

    async saveUser(userData) {
      if (!this.validateUser(userData)) {
        return
      }
      try {
        const method = userData.id ? 'PUT' : 'POST'
        const url = userData.id
          ? `${this.apiEndpoint}/users/${userData.id}`
          : `${this.apiEndpoint}/users`

        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        })

        this.closeModal()
        this.fetchUsers()
      } catch (error) {
        this.errorMessage = error.message
      }
    },

    validateUser(user) {
      if (!user.name || user.name.trim().length < 2) {
        this.errorMessage = '用户名至少需要2个字符'
        return false
      }
      if (!validateEmail(user.email)) {
        this.errorMessage = '请输入有效的邮箱地址'
        return false
      }
      return true
    },

    initializeComponent() {
      console.log('Initializing UserManager')
    },

    setupEventListeners() {
      window.addEventListener('resize', this.handleResize)
    },

    removeEventListeners() {
      window.removeEventListener('resize', this.handleResize)
    },

    handleResize() {
      // 响应窗口大小变化
    },

    refreshData() {
      if (Date.now() - this.lastFetchTime > 60000) {
        this.fetchUsers()
      }
    },

    cleanupTimers() {
      // 清理所有定时器
    },

    logAction(action, details = {}) {
      console.log(`[UserManager] ${action}`, details)
    },
  },
}
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
