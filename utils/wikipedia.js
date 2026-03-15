// Progress: this utility module is implemented and currently used by app features.
// utils/wikipedia.js
export async function fetchWikipediaContent(keyword) {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(keyword)}`
    );
    
    if (!response.ok) {
      console.log("Wikipedia API error:", response.status);
      return null;
    }

    const data = await response.json();
    
    return {
      title: data.title,
      extract: data.extract,
      // Fallback description if extract is too short
      description: data.description || "Traditional Japanese craft form",
    };
  } catch (error) {
    console.log("Error fetching Wikipedia:", error);
    return null;
  }
}

