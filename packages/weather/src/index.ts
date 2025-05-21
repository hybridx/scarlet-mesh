import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
  capabilities: {
    resources: {},
  },
});

// Helper function for making NWS API requests
async function makeNWSRequest<T>(url: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making NWS request:", error);
    return null;
  }
}

interface AlertFeature {
  properties: {
    event?: string;
    areaDesc?: string;
    severity?: string;
    status?: string;
    headline?: string;
  };
}

// Format alert data
function formatAlert(feature: AlertFeature): string {
  const props = feature.properties;
  return [
    `Event: ${props.event || "Unknown"}`,
    `Area: ${props.areaDesc || "Unknown"}`,
    `Severity: ${props.severity || "Unknown"}`,
    `Status: ${props.status || "Unknown"}`,
    `Headline: ${props.headline || "No headline"}`,
    "---",
  ].join("\n");
}

interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  windDirection?: string;
  shortForecast?: string;
}

interface AlertsResponse {
  features: AlertFeature[];
}

interface PointsResponse {
  properties: {
    forecast?: string;
  };
}

interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}

// Register weather tools
server.tool(
  "get-alerts",
  "Get weather alerts for a state",
  {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
  },
  async ({ state }) => {
    const stateCode = state.toUpperCase();
    const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
    const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

    if (!alertsData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve alerts data",
          },
        ],
      };
    }

    const features = alertsData.features || [];
    if (features.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No active alerts for ${stateCode}`,
          },
        ],
      };
    }

    const formattedAlerts = features.map(formatAlert);
    const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join(
      "\n"
    )}`;

    return {
      content: [
        {
          type: "text",
          text: alertsText,
        },
      ],
    };
  }
);

server.tool(
  "get-forecast",
  "Get weather forecast for a location",
  {
    latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .describe("Longitude of the location"),
  },
  async ({ latitude, longitude }) => {
    // Get grid point data
    const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(
      4
    )},${longitude.toFixed(4)}`;
    const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

    if (!pointsData) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
          },
        ],
      };
    }

    const forecastUrl = pointsData.properties?.forecast;
    if (!forecastUrl) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get forecast URL from grid point data",
          },
        ],
      };
    }

    // Get forecast data
    const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
    if (!forecastData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve forecast data",
          },
        ],
      };
    }

    const periods = forecastData.properties?.periods || [];
    if (periods.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No forecast periods available",
          },
        ],
      };
    }

    // Format forecast periods
    const formattedForecast = periods.map((period: ForecastPeriod) =>
      [
        `${period.name || "Unknown"}:`,
        `Temperature: ${period.temperature || "Unknown"}°${
          period.temperatureUnit || "F"
        }`,
        `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
        `${period.shortForecast || "No forecast available"}`,
        "---",
      ].join("\n")
    );

    const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join(
      "\n"
    )}`;

    return {
      content: [
        {
          type: "text",
          text: forecastText,
        },
      ],
    };
  }
);

server.tool(
  "get-sunrise-sunset",
  "Get sunrise and sunset times for a location",
  {
    latitude: z.number().min(-90).max(90).describe("Latitude"),
    longitude: z.number().min(-180).max(180).describe("Longitude"),
    date: z.string().optional().describe("Date in YYYY-MM-DD (optional)"),
  },
  async ({ latitude, longitude, date }) => {
    const url = `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=${date || "today"}&formatted=0`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.results) {
      return { content: [{ type: "text", text: "Failed to retrieve sunrise/sunset data" }] };
    }

    const { sunrise, sunset } = data.results;
    return {
      content: [
        {
          type: "text",
          text: `Sunrise: ${new Date(sunrise).toLocaleTimeString()}\nSunset: ${new Date(sunset).toLocaleTimeString()}`,
        },
      ],
    };
  }
);

// New tool to fetch weather for multiple locations
server.tool(
  "get-multi-location-forecast",
  "Get weather forecasts for multiple locations at once",
  {
    locations: z.array(
      z.object({
        name: z.string().describe("Name of the location"),
        latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
        longitude: z.number().min(-180).max(180).describe("Longitude of the location"),
      })
    ).describe("Array of locations to get forecasts for"),
  },
  async ({ locations }) => {
    const results = [];
    
    for (const location of locations) {
      const { name, latitude, longitude } = location;
      
      // Get grid point data
      const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);
      
      if (!pointsData || !pointsData.properties?.forecast) {
        results.push(`## ${name} (${latitude}, ${longitude})\nFailed to retrieve forecast data for this location.`);
        continue;
      }
      
      // Get forecast data
      const forecastData = await makeNWSRequest<ForecastResponse>(pointsData.properties.forecast);
      
      if (!forecastData || !forecastData.properties?.periods?.length) {
        results.push(`## ${name} (${latitude}, ${longitude})\nNo forecast data available for this location.`);
        continue;
      }
      
      // Get only the first period (current/next forecast period)
      const currentPeriod = forecastData.properties.periods[0];
      
      const forecastSummary = [
        `## ${name} (${latitude}, ${longitude})`,
        `${currentPeriod.name || "Current"}:`,
        `Temperature: ${currentPeriod.temperature || "Unknown"}°${currentPeriod.temperatureUnit || "F"}`,
        `Wind: ${currentPeriod.windSpeed || "Unknown"} ${currentPeriod.windDirection || ""}`,
        `Conditions: ${currentPeriod.shortForecast || "No forecast available"}`,
        ""
      ].join("\n");
      
      results.push(forecastSummary);
    }
    
    return {
      content: [
        {
          type: "text",
          text: `# Multi-Location Weather Forecast\n\n${results.join("\n")}`,
        },
      ],
    };
  }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather MCP Server running on stdio");
  }
  
  main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });