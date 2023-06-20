
const history = {
  getVisits(details) {
    return new Promise(resolve => {
      chrome.history.getVisits(details, function (visitItems) {
        resolve(visitItems)
      })
    })
  },

  search(query) {
    return new Promise(resolve => {
      chrome.history.search(query, function (historyItems) {
        resolve(historyItems)
      })
    })
  },

  unlimitedSearch(query) {
    const now = (new Date).getTime()
    Object.assign(query, {
      endTime: now,
      maxResults: 100,
    })

    const data = {
      visitItemsHash: {},
      historyItems: [],
    }

    function recursiveSearch(query) {
      return history.search(query).then((historyItems) => {
        historyItems = historyItems.filter(historyItem => {
          if (data.visitItemsHash[historyItem.id]) {
            return false
          } else {
            data.visitItemsHash[historyItem.id] = true
            return true
          }
        })

        if (historyItems.length == 0) {
          return data.visitItemsHash
        } else {
          const promises = []
          for (let historyItem of historyItems) {
            const details = { url: historyItem.url }
            const promise = history.getVisits(details)
            promises.push(promise)
          }
          return Promise.all(promises).then((allVisitItems) => {
            let oldestLastVisitTime = now

            for (var i = 0; i < historyItems.length; i++) {
              const historyItem = historyItems[i]
              const visitItems = allVisitItems[i]
              data.visitItemsHash[historyItem.id] = visitItems

              for (visitItem of visitItems) {
                visitItem.title = ''
                Object.assign(visitItem, historyItem)
              }

              if (oldestLastVisitTime > historyItem.lastVisitTime) {
                oldestLastVisitTime = historyItem.lastVisitTime
              }
            }

            query.endTime = oldestLastVisitTime
            return recursiveSearch(query)
          })
        }
      })
    }

    return recursiveSearch(query).then((visitItemsHash) => {
      let allVisitItems = []
      for (visitItems of Object.keys(visitItemsHash)) {
        allVisitItems = allVisitItems.concat(visitItemsHash[visitItems])
      }
      allVisitItems.sort((a, b) => {
        return b.visitTime - a.visitTime
      })
      allVisitItems = allVisitItems.filter(a => {
        return a.visitTime > query.startTime
      })
      return allVisitItems
    })
  }
}

function downloadJson(historyItems) {
  const historyItemsString = JSON.stringify(historyItems, null, 2)
  const blob = new Blob([historyItemsString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const filename = 'history.json'
  chrome.downloads.download({
    filename,
    url,
  })
}

function csvDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
}

function csvTime(date) {
  const minutes = date.getMinutes()
  const minutesString = minutes < 10 ? '0' + minutes : '' + minutes
  const seconds = date.getSeconds()
  const secondsString = seconds < 10 ? '0' + seconds : '' + seconds
  return `${date.getHours()}:${minutesString}:${secondsString}`
}

function csvEscapify(str) {
  const escapeChars = [',', '"', '\r', '\n']
  let needsEscaping = false
  for (let escapeChar of escapeChars) {
    needsEscaping = needsEscaping || str.indexOf(escapeChar) > -1
  }
  if (!needsEscaping) return str
  return `"${str.replace(/"/g, '""')}"`
}

function downloadCsv(historyItems) {
  let raw = '\ufeff'
  raw += 'order,id,date,time,title,url,visitCount,typedCount,transition\r\n'

  for (let i = 0; i < historyItems.length; i++) {
    historyItem = historyItems[i]

    const order = i
    const { id, visitCount, typedCount, transition } = historyItem
    const visitTime = new Date(historyItem.visitTime)
    const date = csvDate(visitTime)
    const time = csvTime(visitTime)
    const title = csvEscapify(historyItem.title)
    const url = csvEscapify(historyItem.url)

    const entry = [
      order,
      id,
      date,
      time,
      title,
      url,
      visitCount,
      typedCount,
      transition,
    ]

    const entryString = entry.join(',')
    raw += entryString + '\r\n'
  }

  const blob = new Blob([raw], { type: 'text/csv;charset=UTF-16LE;' })
  const url = URL.createObjectURL(blob)
  const filename = 'history.csv'
  chrome.downloads.download({
    filename,
    url,
  })
}


