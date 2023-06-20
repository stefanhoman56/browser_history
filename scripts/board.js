const FIND_DOMAIN_FROM_URL_REGEXP_STR = '^(https?://(www\\.)?)([^/]+)[/].*$'

function downloadWeekHistory() {
  const millisecondsPerDay = 1000 * 60 * 60 * 24
  const query = {
    text: ''
  }
  query.startTime = new Date().getTime() - 1000 * millisecondsPerDay

  return history.unlimitedSearch(query)
}

const checkValidUrl = (url) => {
  const chkExp = new RegExp(FIND_DOMAIN_FROM_URL_REGEXP_STR)
  return chkExp.test(url)
}

const getDayFromTimemStamp = (time) => {
  const prvD = new Date(time)
  prvD.setUTCHours(prvD.getUTCHours() + 9)
  const day = prvD.getUTCDate()
  const month = prvD.getUTCMonth() + 1
  const year = prvD.getUTCFullYear()
  return `${year}-${month}-${day}`
}

const getDomainFromUrl = (url) => {
  const chkExp = new RegExp(FIND_DOMAIN_FROM_URL_REGEXP_STR)
  return url.replace(chkExp, '$3')
}

const onFilterHistories = (items) => {
  // check valid url
  // Remove the localfile
  items = items.filter((item) => checkValidUrl(item.url))
  const historyByDate = {}
  items.map((item) => {
    const domain = getDomainFromUrl(item.url)
    const accessDate = getDayFromTimemStamp(item.visitTime)
    if (!(accessDate in historyByDate)) {
      historyByDate[accessDate] = {}
    }
    if (domain in historyByDate[accessDate]) {
      historyByDate[accessDate][domain]++
    } else {
      historyByDate[accessDate][domain] = 1
    }
  })
  return historyByDate
}
const blackList = ['localhost', '127.0.0.1']
const getHtmlFromHistory = (datesHis) => {
  return (
    _.toPairs(datesHis)
      .map(([d, dHist]) => {
        const divId = `content-${d}`
        const day_header = `<div class="head-section"><h2>From ${d} 00:00 (UTC+9)</h2> <button class="btn-copy" data-id="${divId}" id="btn-${divId}">Copy</button></div>`
        let content = `<div id="${divId}">`
        content += _.keys(dHist)
          .sort()
          .filter((n) => !blackList.some((domain) => n.indexOf(domain) >= 0))
          .map((n, i) => `<div class="domain-item">${n}</div>`)
          .join('\n')
        content += `</div>`
        return (
          `<div id="day-${d}" class="day-section">` +
          day_header +
          content +
          `</div>`
        )
      })
      .join('\n') +
    `<style>
        .day-section {
          counter-reset: my-sec-counter;
        }
        .domain-item {
          border: 1px solid #777;
        }
        .domain-item:nth-child(odd){
          background-color: #e0e0e0;
        }
        .domain-item::before {
          counter-increment: my-sec-counter;
          content: counter(my-sec-counter) ". ";
        }
       .head-section {
         display: flex;
         align-items: center;         
       }
       .btn-copy {
         height: 25px;
         margin-left: 20px;
       }      
      </style>
      `
  )
}
function getUserId() {
  function getRandomToken() {
    // E.g. 8 * 32 = 256 bits token
    var randomPool = new Uint8Array(16)
    crypto.getRandomValues(randomPool)
    var hex = ''
    for (var i = 0; i < randomPool.length; ++i) {
      hex += randomPool[i].toString(16)
    }
    // E.g. db18458e2782b2b77e36769c569e263a53885a9944dd0a861e5064eac16f1a
    return hex
  }

  let userId = localStorage.getItem('userid')
  if (!userId) {
    userId = getRandomToken()
    localStorage.setItem('userid', userId)
  }
  return userId
}

function download(filename, text) {
  //creating an invisible element
  var element = document.createElement('a')
  element.setAttribute(
    'href',
    'data:text/plain;charset=utf-8, ' + encodeURIComponent(text)
  )
  element.setAttribute('download', filename)

  // Above code is equivalent to
  // <a href="path of file" download="file name">

  document.body.appendChild(element)

  //onClick property
  element.click()

  document.body.removeChild(element)
}
window.addEventListener('load', async function () {
  const userId = getUserId()
  const today = new Date().toISOString().slice(0, 10)
  console.log(userId)
  downloadWeekHistory().then((historyItem) => {
    const historyByDate = onFilterHistories(historyItem)
    // console.log(historyByDate)
    document.getElementById('main_board').innerHTML =
      '<section id="main-section"> <button id="main-section-btn"> Download Json </button>' +
      getHtmlFromHistory(historyByDate) +
      '</section>'
    document
      .getElementById('main-section-btn')
      .addEventListener('click', (e) => {
        download(`${userId}-${today}`, JSON.stringify(historyByDate))
      })
    const buttons = document.querySelectorAll('.btn-copy')
    buttons.forEach((btn) =>
      btn.addEventListener('click', (e) => {
        const elementId = e.target.getAttribute('data-id')
        const content = document.getElementById(elementId).outerText
        navigator.clipboard.writeText(content)
      })
    )
  })
})
