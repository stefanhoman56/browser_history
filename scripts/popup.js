

window.addEventListener('load', function () {
  let timeSelect = document.getElementById('timeSelect')
  let cache = false

  timeSelect.onchange = function (element) {
    cache = false

    let msg

    switch (timeSelect.value) {
      case 'month':
      case 'forever':
        msg = 'This may take a while...\r\n\r\nChrome only saves 3 months (90 days) of history.'
        break
      case 'day':
      case 'week':
      default:
        msg = '\xa0'
    }

    let msgDiv = document.getElementById('msgDiv')
    msgDiv.innerText = msg
  }
  let dashButton = document.getElementById('dashButton')
  dashButton.onclick = function (element) {
    const url = chrome.runtime.getURL("board.html");
    chrome.tabs.query(
      { windowType: "normal", url: url + "*" },
      (tabs) => {
        if (tabs !== null && tabs.length > 0)
          chrome.tabs.update(tabs[0].id, { active: true });
        else chrome.tabs.create({ url: url });
      }
    );
  }


  let jsonButton = document.getElementById('jsonButton')
  jsonButton.onclick = function (element) {
    if (cache) {
      downloadJson(cache)
      return
    }

    downloadHistory().then((historyItems) => {
      cache = historyItems
      downloadJson(historyItems)
    })
  }

  let csvButton = document.getElementById('csvButton')
  csvButton.onclick = function (element) {
    if (cache) {
      downloadCsv(cache)
      return
    }

    downloadHistory().then((historyItems) => {
      cache = historyItems
      downloadCsv(historyItems)
    })
  }
})

function downloadHistory() {
  const timeSelect = document.getElementById('timeSelect')
  const millisecondsPerDay = 1000 * 60 * 60 * 24

  const query = {
    text: '',
  }

  switch (timeSelect.value) {
    case 'day':
      query.startTime = (new Date).getTime() - millisecondsPerDay
      break
    case 'week':
      query.startTime = (new Date).getTime() - 7 * millisecondsPerDay
      break
    case 'month':
      query.startTime = (new Date).getTime() - 31 * millisecondsPerDay
      break
    case 'forever':
      query.startTime = 0
      break
    default:
  }

  return history.unlimitedSearch(query)
}
