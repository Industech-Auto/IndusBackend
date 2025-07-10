const axios = require("axios")

const getGoogleReviews = async (placeId, apiKey, limit = 4) => {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,reviews&key=${apiKey}`

  try {
    const response = await axios.get(url)
    const googleReviews = response.data.result?.reviews || []

    return googleReviews.slice(0, limit).map((review) => ({
      text: review.text,
      name: review.author_name,
      role: "Google Reviewer",
      rating: review.rating,
      image:
        review.profile_photo_url ||
        "https://randomuser.me/api/portraits/lego/1.jpg",
    }))
  } catch (error) {
    console.error("Error fetching Google reviews:", error.message)
    throw new Error("Failed to fetch Google reviews")
  }
}

module.exports = getGoogleReviews
