import numpy as np
from traffic_engine import TrafficEngine

class RouteOptimizer:
    def __init__(self):
        self.traffic = TrafficEngine()

    def optimize_route(self, start_coords, bins):
        """
        bins: list of dicts with {id, lat, lng, level, priority}
        Greedy Nearest Neighbor with level/priority weighting
        """
        if not bins:
            return []

        remaining_bins = bins.copy()
        route = []
        current_location = start_coords

        while remaining_bins:
            best_bin = None
            best_score = float('inf')

            for i, bin_data in enumerate(remaining_bins):
                dist = self.traffic.get_travel_time(
                    current_location[0], current_location[1],
                    bin_data['lat'], bin_data['lng']
                )
                
                # Weighting: score = dist / (level * priority_multiplier)
                # Higher level/priority means lower score (better)
                priority_map = {'high': 3, 'medium': 2, 'low': 1}
                p_val = priority_map.get(bin_data.get('priority', 'low'), 1)
                level = bin_data.get('level', 1) / 100.0
                
                # Avoid division by zero
                score = dist / (max(level, 0.1) * p_val)

                if score < best_score:
                    best_score = score
                    best_bin = bin_data
                    best_idx = i

            route.append(best_bin)
            current_location = (best_bin['lat'], best_bin['lng'])
            remaining_bins.pop(best_idx)

        return route
