async function loadAnalytics() {

    const distRes = await fetch("/analytics/digit-distribution");
    const distData = await distRes.json();

    const digits = distData.distribution.map(d => d[0]);
    const counts = distData.distribution.map(d => d[1]);

    new Chart(document.getElementById("digitChart"), {
        type: "bar",
        data: {
            labels: digits,
            datasets: [{
                label: "Digit Frequency",
                data: counts
            }]
        }
    });

    const confRes = await fetch("/analytics/avg-confidence");
    const confData = await confRes.json();
    document.getElementById("avgConfidence").innerText =
        `Average Confidence: ${(confData.average_confidence * 100).toFixed(2)}%`;

    const totalRes = await fetch("/analytics/total");
    const totalData = await totalRes.json();
    document.getElementById("totalPredictions").innerText =
        `Total Predictions: ${totalData.total_predictions}`;
}

loadAnalytics();
