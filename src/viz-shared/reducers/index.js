export default function rootReducer(state, action) {
    if (action.type === 'reaxtor-redux/update') {
        return action.json;
    }
    return state;
}
