import random

class TrafficEngine:
    def __init__(self):
        # In a real app, this would connect to a Google Maps or Mapbox API
        pass

    def get_traffic_multiplier(self, lat1, lng1, lat2, lng2):
        """
        Returns a multiplier for travel time based on traffic.
        1.0 means no traffic, >1.0 means heavy traffic.
        """
        # Mocking traffic based on destination coords
        # Let's say areas near (9.925, 78.121) are congested
        distance_to_center = ((lat2 - 9.925)**2 + (lng2 - 78.121)**2)**0.5
        if distance_to_center < 0.005:
            return 1.5 + random.uniform(0, 0.5)
        return 1.0 + random.uniform(0, 0.2)

    def get_travel_time(self, lat1, lng1, lat2, lng2):
        # Rough estimate: distance in km * 2 minutes/km * traffic
        distance = ((lat1 - lat2)**2 + (lng1 - lng2)**2)**0.5 * 111 # rough km conversion
        traffic = self.get_traffic_multiplier(lat1, lng1, lat2, lng2)
        return distance * 2 * traffic
