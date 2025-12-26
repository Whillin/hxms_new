// Script to clean up dirty data ("邀约邀约专员...") via API
// Usage: API_BASE=https://your-api-url.com node scripts/clean-dirty-data.mjs

const base = process.env.API_BASE || 'http://localhost:3002'

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options)
  let body
  try {
    body = await res.json()
  } catch {
    body = null
  }
  return { status: res.status, body }
}

async function loginAdmin() {
  // Default admin credentials - if changed in production, please update here or use a different method
  const payload = { userName: 'Admin', password: '123456' }
  const { body } = await jsonFetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!body || body.code !== 200 || !body.data?.token) {
    throw new Error(`Login failed: ${JSON.stringify(body)}`)
  }
  return body.data.token
}

async function fetchCustomerList(token, page = 1, size = 100) {
  const { body } = await jsonFetch(`${base}/api/customer/list?current=${page}&size=${size}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return body?.data?.records || []
}

async function deleteCustomer(token, id) {
  const { body } = await jsonFetch(`${base}/api/customer/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id })
  })
  return body?.code === 200
}

async function main() {
  console.log(`Targeting API: ${base}`)

  try {
    const token = await loginAdmin()
    console.log('Login successful.')

    let page = 1
    let deletedCount = 0
    let hasMore = true

    while (hasMore) {
      console.log(`Scanning page ${page}...`)
      const list = await fetchCustomerList(token, page, 50)
      console.log(`Page ${page} got ${list?.length || 0} items.`)
      if (list && list.length > 0) {
        console.log(`Sample item: ${JSON.stringify(list[0])}`)
      }

      if (!list || list.length === 0) {
        hasMore = false
        break
      }

      const dirtyItems = list.filter(
        (item) => item.userName && item.userName.startsWith('邀约邀约专员')
      )

      if (dirtyItems.length === 0) {
        // If no dirty items on this page, move to next
        page++
        // Safety break to avoid infinite loops if pages are huge
        if (page > 1000) hasMore = false
        continue
      }

      console.log(`Found ${dirtyItems.length} dirty items on page ${page}. Deleting...`)

      for (const item of dirtyItems) {
        console.log(`Deleting customer: ${item.userName} (ID: ${item.id})`)
        const success = await deleteCustomer(token, item.id)
        if (success) {
          deletedCount++
        } else {
          console.error(`Failed to delete customer ID: ${item.id}`)
        }
      }

      // If we deleted items, the pagination shifts, so we should stay on the same page or re-fetch page 1 to be safe/thorough
      // Simplest is to just re-fetch the current page index (or page 1) in the next iteration.
      // But if we use page++, we might miss items that shifted up.
      // So if we found dirty items, let's NOT increment page, just continue (which re-scans current page number,
      // but since items are deleted, new items fill in).
      // However, if we deleted ALL items on the page, we might get an empty page next time if it was the last page.
      // Let's just reset to page 1 to be absolutely sure we clean everything from top down.
      if (dirtyItems.length > 0) {
        page = 1
      } else {
        page++
      }
    }

    console.log(`Cleanup complete. Total deleted: ${deletedCount}`)
  } catch (err) {
    console.error('Error:', err.message)
  }
}

main()
