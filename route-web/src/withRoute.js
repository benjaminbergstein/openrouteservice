import React from 'react';
import buildPath from './route/buildPath.js';
import get from 'lodash/get';
import slice from 'lodash/slice';

const sameLatlng = (
  { lat: lat1, lng: lng1 },
  { lat: lat2, lng: lng2 }
) => lat1 === lat2 && lng1 === lng2;

const withRoute = (Component) =>
  class extends React.Component {
    constructor(props) {
      super(props);
      const { locationHash } = this.props;

      const path = locationHash ?
        JSON.parse(atob(locationHash)) : [];
      this.state = { path, lines: [], totalDistance: 0 };
      this.appendPoint = this.appendPoint.bind(this);
      this.movePoint = this.movePoint.bind(this);
      this.undo = this.undo.bind(this);
    }

    componentDidMount() {
      const { path } = this.state;
      if (path.length > 1) {
        this.updatePath(path);
      }
    }

    updatePath(newPath, setPrevPath) {
      const { path } = this.state;
      const promise = buildPath(newPath);
      promise.then((paths) => {
        const [lines, totalDistance] = paths.reduce(([lines, totalDistance], p) => {
          const distance = get(p, 'features[0].properties.summary.distance');
          const line = get(p, 'features[0].geometry.coordinates').map(([lat, lng]) => [lng, lat])
          return [[...lines, line], totalDistance + distance]
        }, [[], 0]);
        this.setState({ lines, totalDistance });
      });
      if (setPrevPath !== false) newPath.prevPath = path;
      global.location.hash = btoa(JSON.stringify(newPath));
      this.setState({ path: newPath });
    }

    undo() {
      const { path } = this.state;
      const { prevPath } = path;
      if (prevPath) {
        prevPath.nextPath = path;
        this.updatePath(prevPath, false);
      }
    }

    movePoint(oldLatlng, newLatlng) {
      const { path } = this.state;
      const index = path.indexOf(oldLatlng);
      const newPath = [
        ...slice(path, 0, index),
        newLatlng,
        ...slice(path, index + 1),
      ];
      this.updatePath(newPath);
    }

    appendPoint({ latlng, after }) {
      const { path } = this.state;
      if (after) {
        console.log(after);
      console.log(path.reduce((memo, ll) => {
          return sameLatlng(ll, after) ?
            [...memo, ll, latlng] : [...memo, ll];
        }, [])) }
      this.updatePath(
        after ?
        path.reduce((memo, ll) => {
          return sameLatlng(ll, after) ?
            [...memo, ll, latlng] : [...memo, ll];
        }, []) : [...path, latlng]
      )
    }

    render() {
      return <Component
        path={this.state.path}
        lines={this.state.lines}
        totalDistance={this.state.totalDistance}
        appendPoint={this.appendPoint}
        movePoint={this.movePoint}
        undo={this.undo}
        {...this.props}
      />
    }
  };

export default withRoute;
