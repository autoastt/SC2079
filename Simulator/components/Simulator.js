import React from "react";
import { useState, useEffect } from "react";
import QueryAPI from "./QueryAPI";

const Direction = {
  NORTH: 0,
  EAST: 2,
  SOUTH: 4,
  WEST: 6,
  SKIP: 8,
};

const ObDirection = {
  NORTH: 0,
  EAST: 2,
  SOUTH: 4,
  WEST: 6,
  SKIP: 8,
};

const DirectionToString = {
  0: "Up",
  2: "Right",
  4: "Down",
  6: "Left",
  8: "None",
};

const transformCoord = (x, y) => {
  // Change the coordinate system from (0, 0) at top left to (0, 0) at bottom left
  return { x: 19 - y, y: x };
};

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Simulator() {
  const [robotState, setRobotState] = useState({
    x: 1,
    y: 1,
    d: Direction.NORTH,
    s: -1,
  });
  const [robotX, setRobotX] = useState(1);
  const [robotY, setRobotY] = useState(1);
  const [robotDir, setRobotDir] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [obXInput, setObXInput] = useState(0);
  const [obYInput, setObYInput] = useState(0);
  const [directionInput, setDirectionInput] = useState(ObDirection.NORTH);
  const [isComputing, setIsComputing] = useState(false);
  const [path, setPath] = useState([]);
  const [commands, setCommands] = useState([]);
  const [page, setPage] = useState(0);
  const [healthStatus, setHealthStatus] = useState(null); // null, 'checking', 'success', 'error'

  const generateNewID = () => {
    // Find the highest existing ID and return the next sequential number
    if (obstacles.length === 0) {
      return 1;
    }
    const maxId = Math.max(...obstacles.map(ob => ob.id));
    return maxId + 1;
  };

  const generateRobotCells = () => {
    const robotCells = [];
    let markerX = 0;
    let markerY = 0;

    if (Number(robotState.d) === Direction.NORTH) {
      markerY++;
    } else if (Number(robotState.d) === Direction.EAST) {
      markerX++;
    } else if (Number(robotState.d) === Direction.SOUTH) {
      markerY--;
    } else if (Number(robotState.d) === Direction.WEST) {
      markerX--;
    }

    // Go from i = -1 to i = 1
    for (let i = -1; i < 2; i++) {
      // Go from j = -1 to j = 1
      for (let j = -1; j < 2; j++) {
        // Transform the coordinates to our coordinate system where (0, 0) is at the bottom left
        const coord = transformCoord(robotState.x + i, robotState.y + j);
        // If the cell is the marker cell, add the robot state to the cell
        if (markerX === i && markerY === j) {
          robotCells.push({
            x: coord.x,
            y: coord.y,
            d: robotState.d,
            s: robotState.s,
          });
        } else {
          robotCells.push({
            x: coord.x,
            y: coord.y,
            d: null,
            s: -1,
          });
        }
      }
    }

    return robotCells;
  };

  const onChangeX = (event) => {
    // If the input is an integer and is in the range [0, 19], set ObXInput to the input
    if (Number.isInteger(Number(event.target.value))) {
      const nb = Number(event.target.value);
      if (0 <= nb && nb < 20) {
        setObXInput(nb);
        return;
      }
    }
    // If the input is not an integer or is not in the range [0, 19], set the input to 0
    setObXInput(0);
  };

  const onChangeY = (event) => {
    // If the input is an integer and is in the range [0, 19], set ObYInput to the input
    if (Number.isInteger(Number(event.target.value))) {
      const nb = Number(event.target.value);
      if (0 <= nb && nb <= 19) {
        setObYInput(nb);
        return;
      }
    }
    // If the input is not an integer or is not in the range [0, 19], set the input to 0
    setObYInput(0);
  };

  const onChangeRobotX = (event) => {
    // If the input is an integer and is in the range [1, 18], set RobotX to the input
    if (Number.isInteger(Number(event.target.value))) {
      const nb = Number(event.target.value);
      if (1 <= nb && nb < 19) {
        setRobotX(nb);
        return;
      }
    }
    // If the input is not an integer or is not in the range [1, 18], set the input to 1
    setRobotX(1);
  };

  const onChangeRobotY = (event) => {
    // If the input is an integer and is in the range [1, 18], set RobotY to the input
    if (Number.isInteger(Number(event.target.value))) {
      const nb = Number(event.target.value);
      if (1 <= nb && nb < 19) {
        setRobotY(nb);
        return;
      }
    }
    // If the input is not an integer or is not in the range [1, 18], set the input to 1
    setRobotY(1);
  };

  const onClickObstacle = () => {
    // If the input is not valid, return
    if (!obXInput && !obYInput) return;
    // Create a new array of obstacles
    const newObstacles = [...obstacles];
    // Add the new obstacle to the array
    newObstacles.push({
      x: obXInput,
      y: obYInput,
      d: directionInput,
      id: generateNewID(),
    });
    // Set the obstacles to the new array
    setObstacles(newObstacles);
  };

  const onClickRobot = () => {
    // Set the robot state to the input

    setRobotState({ x: robotX, y: robotY, d: robotDir, s: -1 });
  };

  const onDirectionInputChange = (event) => {
    // Set the direction input to the input
    setDirectionInput(Number(event.target.value));
  };

  const onRobotDirectionInputChange = (event) => {
    // Set the robot direction to the input
    setRobotDir(event.target.value);
  };

  const onRemoveObstacle = (ob) => {
    // If the path is not empty or the algorithm is computing, return
    if (path.length > 0 || isComputing) return;
    // Create a new array of obstacles
    const newObstacles = [];
    // Add all the obstacles except the one to remove to the new array
    for (const o of obstacles) {
      if (o.x === ob.x && o.y === ob.y) continue;
      newObstacles.push(o);
    }
    // Set the obstacles to the new array
    setObstacles(newObstacles);
  };

  const onGridClick = (x, y) => {
    if (isComputing || path.length > 0) return;
    
    // Check if clicking on robot position
    const robotCells = generateRobotCells();
    for (const cell of robotCells) {
      if (cell.x === x && cell.y === y) {
        return; // Don't allow placing obstacle on robot
      }
    }
    
    // Check if obstacle already exists at this position
    for (const ob of obstacles) {
      const obTransformed = transformCoord(ob.x, ob.y);
      if (obTransformed.x === x && obTransformed.y === y) {
        // Cycle through directions instead of removing
        const directions = [ObDirection.NORTH, ObDirection.EAST, ObDirection.SOUTH, ObDirection.WEST, ObDirection.SKIP];
        const currentIndex = directions.indexOf(ob.d);
        const nextIndex = (currentIndex + 1) % directions.length;
        
        const newObstacles = obstacles.map(o => 
          o.id === ob.id ? { ...o, d: directions[nextIndex] } : o
        );
        setObstacles(newObstacles);
        return;
      }
    }
    
    // Add new obstacle - convert grid coordinates back to original
    // The grid renders with transformed coordinates, so we need to reverse it
    // transformCoord does: { x: 19 - y, y: x }
    // So to reverse: if grid shows (x, y), original is (y, 19 - x)
    const newObstacles = [...obstacles];
    newObstacles.push({
      x: y,           // original x = grid y
      y: 19 - x,      // original y = 19 - grid x
      d: ObDirection.NORTH,  // Default direction, can be changed by clicking again
      id: generateNewID(),
    });
    setObstacles(newObstacles);
  };
  const getCommandExplanation = (command) => {
    if (!command) return "";
    
    // Extract command type and distance
    const cmdType = command.substring(0, 2);
    const distance = command.substring(2);
    
    const explanations = {
      'FW': `Move forward ${distance}cm`,
      'BW': `Move backward ${distance}cm`,
      'FR': `Turn forward-right ${distance}cm`,
      'FL': `Turn forward-left ${distance}cm`,
      'BR': `Turn backward-right ${distance}cm`,
      'BL': `Turn backward-left ${distance}cm`,
    };
    
    return explanations[cmdType] || command;
  };
  const checkHealth = () => {
    setHealthStatus('checking');
    QueryAPI.healthCheck((response) => {
      if (response.error) {
        setHealthStatus('error');
        // Clear status after 10 seconds
        setTimeout(() => setHealthStatus(null), 10000);
      } else {
        setHealthStatus('success');
        // Clear status after 10 seconds
        setTimeout(() => setHealthStatus(null), 10000);
      }
    });
  };

  const compute = () => {
    // Set computing to true, act like a lock
    setIsComputing(true);
    // Call the query function from the API
    QueryAPI.query(obstacles, robotX, robotY, robotDir, (data, err) => {
      if (data) {
        // If the data is valid, set the path
        setPath(data.data.path);
        // Set the commands
        const commands = [];
        for (let x of data.data.commands) {
          // If the command is a snapshot, skip it
          if (x.startsWith("SNAP")) {
            continue;
          }
          commands.push(x);
        }
        setCommands(commands);
      }
      // Set computing to false, release the lock
      setIsComputing(false);
    });
  };

  const onResetAll = () => {
    // Reset all the states
    setRobotX(1);
    setRobotDir(0);
    setRobotY(1);
    setRobotState({ x: 1, y: 1, d: Direction.NORTH, s: -1 });
    setPath([]);
    setCommands([]);
    setPage(0);
    setObstacles([]);
  };

  const onReset = () => {
    // Reset all the states
    setRobotX(1);
    setRobotDir(0);
    setRobotY(1);
    setRobotState({ x: 1, y: 1, d: Direction.NORTH, s: -1 });
    setPath([]);
    setCommands([]);
    setPage(0);
  };

  const renderGrid = () => {
    // Initialize the empty rows array
    const rows = [];

    const baseStyle = {
      width: 25,
      height: 25,
      borderStyle: "solid",
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      padding: 0,
    };

    // Generate robot cells
    const robotCells = generateRobotCells();

    // Generate the grid
    for (let i = 0; i < 20; i++) {
      const cells = [
        // Header cells
        <td key={`h-${i}`} className="w-5 h-5 md:w-10 md:h-10 bg-gray-100">
          <span className="text-gray-700 font-bold text-[0.6rem] md:text-sm ">
            {19 - i}
          </span>
        </td>,
      ];

      for (let j = 0; j < 20; j++) {
        let foundOb = null;
        let foundRobotCell = null;

        for (const ob of obstacles) {
          const transformed = transformCoord(ob.x, ob.y);
          if (transformed.x === i && transformed.y === j) {
            foundOb = ob;
            break;
          }
        }

        if (!foundOb) {
          for (const cell of robotCells) {
            if (cell.x === i && cell.y === j) {
              foundRobotCell = cell;
              break;
            }
          }
        }

        const hoverClass = "cursor-pointer hover:bg-slate-100 hover:border-slate-400 transition-colors";
        
        if (foundOb) {
          if (foundOb.d === Direction.WEST) {
            cells.push(
              <td key={`${i}-${j}`} onClick={() => onGridClick(i, j)} className={`border border-l-4 border-l-rose-500 w-5 h-5 md:w-10 md:h-10 bg-slate-700 ${hoverClass}`} />
            );
          } else if (foundOb.d === Direction.EAST) {
            cells.push(
              <td key={`${i}-${j}`} onClick={() => onGridClick(i, j)} className={`border border-r-4 border-r-rose-500 w-5 h-5 md:w-10 md:h-10 bg-slate-700 ${hoverClass}`} />
            );
          } else if (foundOb.d === Direction.NORTH) {
            cells.push(
              <td key={`${i}-${j}`} onClick={() => onGridClick(i, j)} className={`border border-t-4 border-t-rose-500 w-5 h-5 md:w-10 md:h-10 bg-slate-700 ${hoverClass}`} />
            );
          } else if (foundOb.d === Direction.SOUTH) {
            cells.push(
              <td key={`${i}-${j}`} onClick={() => onGridClick(i, j)} className={`border border-b-4 border-b-rose-500 w-5 h-5 md:w-10 md:h-10 bg-slate-700 ${hoverClass}`} />
            );
          } else if (foundOb.d === Direction.SKIP) {
            cells.push(
              <td key={`${i}-${j}`} onClick={() => onGridClick(i, j)} className={`border w-5 h-5 md:w-10 md:h-10 bg-slate-700 ${hoverClass}`} />
            );
          }
        } else if (foundRobotCell) {
          if (foundRobotCell.d !== null) {
            cells.push(
              <td
                key={`${i}-${j}`}
                className={`border w-5 h-5 md:w-10 md:h-10 ${
                  foundRobotCell.s != -1 ? "bg-rose-500" : "bg-amber-400"
                }`}
              />
            );
          } else {
            cells.push(
              <td key={`${i}-${j}`} className="bg-emerald-500 border-white border w-5 h-5 md:w-10 md:h-10" />
            );
          }
        } else {
          cells.push(
            <td key={`${i}-${j}`} onClick={() => onGridClick(i, j)} className={`border-gray-200 border w-5 h-5 md:w-10 md:h-10 bg-white ${hoverClass}`} />
          );
        }
      }

      rows.push(<tr key={`row-${i}`}>{cells}</tr>);
    }

    const yAxis = [<td key="y-0" className="bg-gray-100" />];
    for (let i = 0; i < 20; i++) {
      yAxis.push(
        <td key={`y-${i + 1}`} className="w-5 h-5 md:w-10 md:h-10 bg-gray-100">
          <span className="text-gray-700 font-bold text-[0.6rem] md:text-sm ">
            {i}
          </span>
        </td>
      );
    }
    rows.push(<tr key="row-axis">{yAxis}</tr>);
    return rows;
  };

  useEffect(() => {
    if (page >= path.length) return;
    setRobotState(path[page]);
  }, [page, path]);

  return (
    <div className="flex flex-col items-center justify-center px-4 py-6 min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl">
        <div className="flex flex-col items-center text-center bg-white border-b-4 border-slate-900 rounded-lg shadow-sm mb-8 p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Algorithm Simulator</h1>
          <p className="text-slate-600 text-sm">Click on grid to add obstacles • Click existing obstacles to change direction</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          <div className="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-gray-200">
              Robot Position
            </h2>
          <div className="form-control">
            <label className="input-group input-group-horizontal">
              <span className="bg-slate-800 text-white font-medium p-2 text-sm">X</span>
              <input
                onChange={onChangeRobotX}
                type="number"
                placeholder="1"
                min="1"
                max="18"
                value={robotX}
                className="input input-bordered bg-white text-slate-900 font-medium w-20 border-gray-300"
              />
              <span className="bg-slate-800 text-white font-medium p-2 text-sm">Y</span>
              <input
                onChange={onChangeRobotY}
                type="number"
                placeholder="1"
                min="1"
                max="18"
                value={robotY}
                className="input input-bordered bg-white text-slate-900 font-medium w-20 border-gray-300"
              />
              <span className="bg-slate-800 text-white font-medium p-2 text-sm">D</span>
              <select
                onChange={onRobotDirectionInputChange}
                value={robotDir}
                className="select select-bordered bg-white text-slate-900 font-medium py-2 pl-2 pr-6 border-gray-300"
              >
                <option value={ObDirection.NORTH}>Up</option>
                <option value={ObDirection.SOUTH}>Down</option>
                <option value={ObDirection.WEST}>Left</option>
                <option value={ObDirection.EAST}>Right</option>
              </select>
              <button className="btn bg-slate-900 hover:bg-slate-700 text-white font-medium p-2 border-0" onClick={onClickRobot}>
                Set
              </button>
            </label>
          </div>
        </div>

          <div className="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-gray-200">
              Add Obstacles
            </h2>
        <div className="form-control">
          <label className="input-group input-group-horizontal">
            <span className="bg-slate-800 text-white font-medium p-2 text-sm">X</span>
            <input
              onChange={onChangeX}
              type="number"
              placeholder="0"
              min="0"
              max="19"
              value={obXInput}
              className="input input-bordered bg-white text-slate-900 font-medium w-20 border-gray-300"
            />
            <span className="bg-slate-800 text-white font-medium p-2 text-sm">Y</span>
            <input
              onChange={onChangeY}
              type="number"
              placeholder="0"
              min="0"
              max="19"
              value={obYInput}
              className="input input-bordered bg-white text-slate-900 font-medium w-20 border-gray-300"
            />
            <span className="bg-slate-800 text-white font-medium p-2 text-sm">D</span>
            <select
              onChange={onDirectionInputChange}
              value={directionInput}
              className="select select-bordered bg-white text-slate-900 font-medium py-2 pl-2 pr-6 border-gray-300"
            >
              <option value={ObDirection.NORTH}>Up</option>
              <option value={ObDirection.SOUTH}>Down</option>
              <option value={ObDirection.WEST}>Left</option>
              <option value={ObDirection.EAST}>Right</option>
              <option value={ObDirection.SKIP}>None</option>
            </select>
            <button className="btn bg-slate-900 hover:bg-slate-700 text-white font-medium p-2 border-0" onClick={onClickObstacle}>
              Add
            </button>
          </label>
        </div>
      </div>
      </div>

      {/* Obstacles List */}
      {obstacles.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-gray-200 text-center">
            Obstacles ({obstacles.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-center">
            {obstacles.map((ob) => {
              return (
                <div
                  key={ob.id}
                  className="relative flex flex-col bg-gray-50 text-slate-900 rounded-md p-3 border border-gray-300 hover:border-slate-400 transition-all"
                >
                  <button
                    onClick={() => onRemoveObstacle(ob)}
                    className="absolute -top-2 -right-2 btn btn-circle btn-xs bg-slate-900 hover:bg-slate-700 text-white border-0"
                    title="Remove obstacle"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <div className="text-sm font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-600">ID:</span>
                      <span className="font-bold text-slate-900">{ob.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">X:</span>
                      <span className="font-semibold">{ob.x}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Y:</span>
                      <span className="font-semibold">{ob.y}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Dir:</span>
                      <span className="font-semibold">{DirectionToString[ob.d]}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <button 
          className={classNames(
            "btn font-medium px-6 border-0",
            healthStatus === 'success' ? "bg-emerald-500 hover:bg-emerald-600 text-white" : 
            healthStatus === 'error' ? "bg-red-500 hover:bg-red-600 text-white" :
            "bg-slate-200 hover:bg-slate-300 text-slate-900"
          )}
          onClick={checkHealth}
          disabled={healthStatus === 'checking'}
        >
          {healthStatus === 'checking' ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Checking...
            </>
          ) : healthStatus === 'success' ? (
            <>
              ✓ API Connected
            </>
          ) : healthStatus === 'error' ? (
            <>
              ✗ Connection Failed
            </>
          ) : (
            'Check API'
          )}
        </button>
        <button className="btn bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium px-6 border-0" onClick={onResetAll}>
          Reset All
        </button>
        <button className="btn bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium px-6 border-0" onClick={onReset}>
          Reset Robot
        </button>
        <button 
          className="btn bg-slate-900 hover:bg-slate-700 text-white font-semibold px-6 border-0" 
          onClick={compute}
          disabled={isComputing || obstacles.length === 0}
        >
          {isComputing ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Computing...
            </>
          ) : (
            'Start Pathfinding'
          )}
        </button>
      </div>

      {/* Path Navigation */}
      {path.length > 0 && (
        <div className="flex flex-row items-center justify-center text-center bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 gap-4">
          <button
            className="btn bg-slate-900 hover:bg-slate-700 btn-circle border-0"
            disabled={page === 0}
            onClick={() => {
              setPage(page - 1);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="flex flex-col items-center mx-4">
            <span className="text-sm text-slate-600 font-medium">
              Step {page + 1} of {path.length}
            </span>
            <span className="text-lg font-bold text-slate-900">{commands[page]}</span>
            <span className="text-sm text-slate-500 mt-1">{getCommandExplanation(commands[page])}</span>
          </div>
          
          <button
            className="btn bg-slate-900 hover:bg-slate-700 btn-circle border-0"
            disabled={page === path.length - 1}
            onClick={() => {
              setPage(page + 1);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}
      {/* Grid */}
      <div className="flex flex-col items-center">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-emerald-500 border border-gray-300"></div>
              <span className="font-medium text-slate-700">Robot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-amber-400 border border-gray-300"></div>
              <span className="font-medium text-slate-700">Camera</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-700 border border-red-500 border-l-4"></div>
              <span className="font-medium text-slate-700">Obstacle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-rose-500 border border-gray-300"></div>
              <span className="font-medium text-slate-700">Capturing</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <table className="border-collapse border border-gray-300">
          <tbody>{renderGrid()}</tbody>
        </table>
      </div>
      </div>
      </div>
    </div>
  );
}
